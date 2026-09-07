"""CLI for the learning project. Run from any cwd; paths default beside this file."""
import argparse
import hashlib
import json
from pathlib import Path
import platform
import tempfile
import time
from core import Identity, canonical, connect, init, ingest, parse, retrieve, retrieval_metrics, validate_citations
from workflow import draft, approve, execute, issue_token

HERE = Path(__file__).resolve().parent
CORPUS = HERE / 'corpus'
CALLER = Identity('a', 'alice', frozenset({'knowledge:read', 'tickets:draft', 'tickets:execute'}))
OPERATOR = Identity('a', 'operator', frozenset({'tickets:approve'}))


def seed(db, chunk_chars=450):
    init(db)
    entries = json.loads((CORPUS / 'manifest.json').read_text(encoding='utf-8'))
    return [ingest(db, CORPUS, e, chunk_chars) for e in entries]


def demo(db):
    jobs = seed(db)
    response = retrieve(db, CALLER, 'XR-200 的额定功率是多少？')
    top = response['context'][0]
    citation = {k: top[k] for k in ('chunk_id', 'revision')}
    citation['quote'] = top['body']
    validate_citations(db, CALLER, [citation])
    row = draft(db, CALLER, 'demo-ticket-v1', '核对设备标签', '请核对 XR-200 标签与当前手册。')
    if row['status'] == 'pending':
        approve(db, OPERATOR, row['run_id'], row['fingerprint'])
    if row['status'] != 'completed':
        try:
            execute(db, CALLER, row['run_id'], fault='after_effect')
        except ValueError as exc:
            if str(exc) != 'injected_response_lost':
                raise
    result = execute(db, CALLER, row['run_id'])
    with connect(db) as con:
        count = con.execute('SELECT count(*) FROM tickets WHERE operation_id=?', (row['run_id'],)).fetchone()[0]
    return {'mode': 'offline evidence + deterministic workflow; no LLM', 'documents': len(jobs),
            'top_document': top['doc_id'], 'reference_document': 'xr200', 'evidence': top['body'],
            'citation_valid': True, 'warning': '引用存在不代表主张正确；此查询的词项基线把相邻型号排到第一。',
            'ticket_count_after_recovery': count, 'workflow_result': result}


def evaluate(args):
    from importlib.metadata import version, PackageNotFoundError
    model = reranker = None
    if args.neural:
        from models import Dense, Reranker
        model = Dense(args.cache)
        if args.rerank:
            reranker = Reranker(Path(args.cache) / 'reranker')
    elif args.rerank:
        raise SystemExit('--rerank requires --neural')
    questions = json.loads((CORPUS / 'questions.json').read_text(encoding='utf-8'))
    if not questions or len({q['id'] for q in questions}) != len(questions):
        raise ValueError('empty or duplicate question set')
    modes = [('bm25', None)] + ([('dense', None), ('hybrid', None)] if model else [])
    if reranker:
        modes.append(('hybrid', reranker))
    records, summary = [], []
    with tempfile.TemporaryDirectory(prefix='knowledge-eval-') as temp:
        db = Path(temp) / 'eval.db'
        seed(db, args.chunk_chars)
        for mode, ranker in modes:
            label = mode + ('+rerank' if ranker else '')
            measured = []
            for q in questions:
                result = retrieve(db, Identity(q['tenant'], q['subject']), q['question'], mode=mode,
                                  k=args.k, candidate_k=args.candidate_k, context_chars=args.context_chars,
                                  model=model, reranker=ranker)
                # Compute document metrics on unique docs, not duplicated chunks of one doc.
                final_ids = [c['doc_id'] for c in result['context']]
                metrics = retrieval_metrics(final_ids, q['gold_doc_ids'], args.k)
                record = {'question_id': q['id'], 'group': q['group'], 'mode': label,
                          'metrics': metrics, 'doc_ids': list(dict.fromkeys(final_ids)),
                          'gold_doc_ids': q['gold_doc_ids'], 'elapsed_ms': result['elapsed_ms'],
                          'context_chars': result['context_chars'], 'candidates': result['candidates']}
                records.append(record)
                if metrics['recall'] is not None:
                    measured.append(record)
            summary.append({'mode': label, 'answerable_questions': len(measured),
                **{key: sum(r['metrics'][key] for r in measured) / len(measured) for key in ('hit', 'recall', 'mrr', 'ndcg')},
                'median_ms': sorted(r['elapsed_ms'] for r in measured)[len(measured)//2],
                'p95_ms_small_sample': sorted(r['elapsed_ms'] for r in measured)[max(0, int(len(measured)*0.95)-1)]})
    packages = {}
    for name in ('fastembed', 'mcp', 'langgraph', 'onnxruntime'):
        try:
            packages[name] = version(name)
        except PackageNotFoundError:
            pass
    report = {'kind': 'development-corpus experiment, not production accuracy',
              'no_answer_questions': 'reported separately; candidate retrieval does not prove a confident answer',
              'reranker_language_limit': 'default reranker is English; Chinese results are an explicit transfer experiment',
              'config': {k: getattr(args,k) for k in ('k','candidate_k','chunk_chars','context_chars','neural','rerank')},
              'python': platform.python_version(), 'platform': platform.platform(), 'packages': packages,
              'embedding_version': model.version if model else None,
              'corpus_sha256': hashlib.sha256(b''.join(p.read_bytes() for p in sorted(CORPUS.glob('*')))).hexdigest(),
              'code_sha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.glob('*.py')},
              'summary': summary, 'records': records}
    dest = Path(args.report)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    return {'report': str(dest), 'summary': summary}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--db', default=str(HERE / '.runtime' / 'lab.db'))
    sub = p.add_subparsers(dest='command', required=True)
    sub.add_parser('demo')
    sub.add_parser('init')
    inspect = sub.add_parser('inspect')
    inspect.add_argument('file')
    inspect.add_argument('--chunk-chars', type=int, default=450)
    load = sub.add_parser('ingest')
    load.add_argument('--corpus', default=str(CORPUS))
    load.add_argument('--manifest', default='manifest.json')
    load.add_argument('--chunk-chars', type=int, default=450)
    sub.add_parser('jobs')
    search = sub.add_parser('search')
    search.add_argument('question')
    token = sub.add_parser('token')
    token.add_argument('--port', type=int, default=8932)
    ev = sub.add_parser('evaluate')
    ev.add_argument('--neural', action='store_true')
    ev.add_argument('--rerank', action='store_true')
    ev.add_argument('--k', type=int, default=3)
    ev.add_argument('--candidate-k', type=int, default=12)
    ev.add_argument('--chunk-chars', type=int, default=450)
    ev.add_argument('--context-chars', type=int, default=2400)
    ev.add_argument('--cache', default=str(HERE / '.runtime' / 'models'))
    ev.add_argument('--report', default=str(HERE / '.runtime' / 'evaluation.json'))
    ag = sub.add_parser('agent')
    ag.add_argument('question')
    ag.add_argument('--model', required=True)
    ag.add_argument('--operation-id', required=True)
    args = p.parse_args()
    if args.command == 'demo':
        result = demo(args.db)
    elif args.command == 'init':
        result = seed(args.db)
    elif args.command == 'inspect':
        result = parse(args.file,args.chunk_chars)
    elif args.command == 'ingest':
        init(args.db)
        root=Path(args.corpus)
        entries=json.loads((root/args.manifest).read_text(encoding='utf-8'))
        result=[ingest(args.db,root,e,args.chunk_chars) for e in entries]
    elif args.command == 'jobs':
        init(args.db)
        with connect(args.db) as con:
            result=[dict(row) for row in con.execute('SELECT * FROM jobs ORDER BY updated DESC LIMIT 50')]
    elif args.command == 'search':
        init(args.db)
        result = retrieve(args.db, CALLER, args.question)
    elif args.command == 'token':
        init(args.db)
        # Intentionally prints a short-lived LOCAL credential for the operator to copy.
        print(issue_token(args.db, CALLER, f'http://127.0.0.1:{args.port}/mcp'))
        return
    elif args.command == 'evaluate':
        result = evaluate(args)
    else:
        from agent import run, ollama
        result = run(args.db, CALLER, args.question, args.operation_id,
                     lambda messages, timeout: ollama(args.model, messages, timeout))
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
