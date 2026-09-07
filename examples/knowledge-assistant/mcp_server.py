"""MCP SDK 2.1.1. HTTP uses opaque test tokens; stdio is explicitly one local identity."""
import argparse
import json
from mcp.server import MCPServer
from mcp.server.auth.provider import AccessToken, TokenVerifier
from mcp.server.auth.settings import AuthSettings
from mcp.server.auth.middleware.auth_context import get_access_token
from mcp.server.mcpserver.exceptions import ToolError
from pydantic import AnyHttpUrl, BaseModel
from core import Identity, Rejected, init, retrieve, visible_chunks
from workflow import draft, execute, verify_token


class Evidence(BaseModel):
    chunk_id: str
    doc_id: str
    revision: int
    title: str
    section: str
    page: int | None
    body: str


class SearchResult(BaseModel):
    status: str
    evidence: list[Evidence]


class DraftResult(BaseModel):
    run_id: str
    status: str
    fingerprint: str


class TicketResult(BaseModel):
    ticket_id: str
    status: str


def create_server(db, resource, local_identity=None):
    class LocalVerifier(TokenVerifier):
        async def verify_token(self, token):
            row = verify_token(db, token, resource)
            if row is None:
                return None
            return AccessToken(token=token, client_id='lab-client', subject=row['subject'],
                               scopes=row['scopes'], expires_at=row['expires'], resource=row['audience'],
                               claims={'tenant': row['tenant']})

    options = {} if local_identity else {
        'token_verifier': LocalVerifier(),
        'auth': AuthSettings(issuer_url=AnyHttpUrl('https://auth.example.invalid'),
                             resource_server_url=AnyHttpUrl(resource),
                             required_scopes=['knowledge:read'], validate_token_resource=True)}
    server = MCPServer('knowledge-lab', **options)

    def identity():
        if local_identity is not None:
            return local_identity
        token = get_access_token()
        if token is None or not token.subject or not token.claims or not token.claims.get('tenant'):
            raise ToolError('authentication_required')
        return Identity(token.claims['tenant'], token.subject, frozenset(token.scopes))

    def invoke(fn, *args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Rejected as exc:
            raise ToolError(str(exc)) from exc

    @server.tool()
    def search_knowledge(query: str, limit: int = 3) -> SearchResult:
        """搜索当前用户可见的知识，最多返回10条带来源的证据；不生成答案、不创建工单。"""
        if type(limit) is not int or not 1 <= limit <= 10:
            raise ToolError('limit_out_of_range')
        result = invoke(retrieve, db, identity(), query, k=limit)
        # Server-side transport limits apply even if the model requests an enormous result.
        return SearchResult(status=result['status'], evidence=[Evidence(**{k: c[k] for k in Evidence.model_fields}) for c in result['context']])

    @server.resource('knowledge://{doc_id}')
    def read_document(doc_id: str) -> str:
        chunks = [c for c in invoke(visible_chunks, db, identity()) if c['doc_id'] == doc_id]
        if not chunks:
            raise ToolError('document_not_found_or_not_permitted')
        text = '\n\n'.join(c['body'] for c in chunks)
        if len(text) > 10000:
            raise ToolError('document_too_large_use_search')
        return text

    @server.tool()
    def draft_ticket(operation_id: str, title: str, body: str) -> DraftResult:
        """创建待审批工单草稿；同一业务操作重试必须复用operation_id。不会提交工单。"""
        row = invoke(draft, db, identity(), operation_id, title, body)
        return DraftResult(**{k: row[k] for k in ('run_id', 'status', 'fingerprint')})

    @server.tool()
    def execute_ticket(run_id: str) -> TicketResult:
        """提交已由人工批准的本人工单；未批准、过期或无权限会被拒绝。"""
        return TicketResult(**invoke(execute, db, identity(), run_id))

    # Approval is deliberately absent from the model's tools; use a separate operator identity.
    return server


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', required=True)
    parser.add_argument('--port', type=int, default=8932)
    parser.add_argument('--host', choices=['127.0.0.1', '0.0.0.0'], default='127.0.0.1')
    parser.add_argument('--stdio', action='store_true')
    args = parser.parse_args()
    init(args.db)
    local = Identity('a', 'alice', frozenset({'knowledge:read', 'tickets:draft', 'tickets:execute'})) if args.stdio else None
    server = create_server(args.db, f'http://127.0.0.1:{args.port}/mcp', local)
    if args.stdio:
        server.run()
    else:
        server.run(transport='streamable-http', host=args.host, port=args.port)
