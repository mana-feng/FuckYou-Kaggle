"""Actual HTTP/stdio MCP client with deterministic resource cleanup and a timeout."""
import argparse
import asyncio
import json
import os
from pathlib import Path
import sys
import httpx2
from mcp import Client, StdioServerParameters
from mcp.client.streamable_http import streamable_http_client


async def visit(client, query):
    tools = await client.list_tools()
    result = await client.call_tool('search_knowledge', {'query': query, 'limit': 3})
    return {'protocol': client.protocol_version, 'tools': [t.name for t in tools.tools],
            'is_error': result.is_error, 'result': result.structured_content}


async def run(args):
    mode = 'legacy' if args.legacy else 'auto'
    async with asyncio.timeout(30):
        if args.stdio_db:
            params = StdioServerParameters(command=sys.executable,
                args=['-X', 'utf8', str(Path(__file__).with_name('mcp_server.py')), '--db', str(Path(args.stdio_db).resolve()), '--stdio'],
                env={k: v for k, v in os.environ.items() if k in {'PATH', 'SYSTEMROOT', 'WINDIR', 'PYTHONPATH', 'PYTHONUTF8'}})
            async with Client(params, mode=mode, read_timeout_seconds=20) as client:
                return await visit(client, args.query)
        token = os.environ.get('LAB_TOKEN')
        if not token:
            raise SystemExit('Set LAB_TOKEN from the local token command first; never put it in tool arguments.')
        async with httpx2.AsyncClient(headers={'Authorization': 'Bearer ' + token}, timeout=20, follow_redirects=False) as http:
            transport = streamable_http_client(args.url, http_client=http)
            async with Client(transport, mode=mode, read_timeout_seconds=20) as client:
                return await visit(client, args.query)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--url', default='http://127.0.0.1:8932/mcp')
    p.add_argument('--stdio-db')
    p.add_argument('--legacy', action='store_true')
    p.add_argument('--query', default='XR-200 的功率是多少？')
    print(json.dumps(asyncio.run(run(p.parse_args())), ensure_ascii=False, indent=2))
