import copy
import json
from pathlib import Path
import shutil
import tempfile
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from core import Identity, Rejected, connect, delete_document, ingest, parse, retrieve, retrieval_metrics, rrf, validate_citations, visible_chunks
from lab import CALLER, CORPUS, OPERATOR, demo, seed
from workflow import approve, cancel, draft, execute, issue_token, verify_token
from agent import run


class LabTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db = Path(self.temp.name) / 'test.db'
        self.corpus = Path(self.temp.name) / 'corpus'
        shutil.copytree(CORPUS, self.corpus)
        seed(self.db)
        self.entry = json.loads((self.corpus/'manifest.json').read_text(encoding='utf-8'))[0]

    def count(self, table):
        if table not in {'chunks','tickets','runs','jobs'}:
            raise AssertionError('test table must be allowlisted')
        with connect(self.db) as con:
            return con.execute('SELECT count(*) FROM '+table).fetchone()[0]

    def new_run(self, key='operation-0001'):
        return draft(self.db, CALLER, key, '核对设备', '请核对型号和当前手册。')

    def approved_run(self, key='operation-0001'):
        row=self.new_run(key)
        approve(self.db, OPERATOR, row['run_id'], row['fingerprint'])
        return row

    def test_duplicate_ingestion_is_idempotent(self):
        n=self.count('chunks')
        self.assertEqual(ingest(self.db,self.corpus,self.entry)['status'],'unchanged')
        self.assertEqual(self.count('chunks'),n)

    def test_same_revision_different_content_is_rejected(self):
        (self.corpus/'xr200.md').write_text('# 改过\n\n新内容。',encoding='utf-8')
        with self.assertRaisesRegex(Rejected,'revision_conflict'):
            ingest(self.db,self.corpus,self.entry)

    def test_publish_failure_preserves_previous_version(self):
        previous=visible_chunks(self.db,CALLER)
        self.entry['revision']=2
        (self.corpus/'xr200.md').write_text('# 新版\n\n替换内容。',encoding='utf-8')
        with self.assertRaisesRegex(Rejected,'injected_before_commit'):
            ingest(self.db,self.corpus,self.entry,fault='before_commit')
        self.assertEqual(previous,visible_chunks(self.db,CALLER))
        with connect(self.db) as con:
            self.assertEqual(con.execute("SELECT count(*) FROM jobs WHERE status='failed'").fetchone()[0],1)

    def test_failed_job_can_be_replayed(self):
        self.entry['revision']=2
        with self.assertRaises(Rejected):
            ingest(self.db,self.corpus,self.entry,fault='after_parse')
        self.assertEqual(ingest(self.db,self.corpus,self.entry)['status'],'published')

    def test_out_of_order_revision_cannot_win(self):
        self.entry['revision']=2
        ingest(self.db,self.corpus,self.entry)
        self.entry['revision']=1
        self.assertEqual(ingest(self.db,self.corpus,self.entry)['status'],'stale')

    def test_delete_tombstone_blocks_delayed_job(self):
        delete_document(self.db,'a','xr200',2)
        self.assertEqual(ingest(self.db,self.corpus,self.entry)['status'],'stale')
        self.assertNotIn('xr200',{x['doc_id'] for x in visible_chunks(self.db,CALLER)})

    def test_acl_change_invalidates_old_citation(self):
        c=next(c for c in visible_chunks(self.db,CALLER) if c['doc_id']=='xr200')
        citation={'chunk_id':c['chunk_id'],'revision':c['revision'],'quote':c['body']}
        self.assertTrue(validate_citations(self.db,CALLER,[citation]))
        self.entry.update(revision=2,readers=['hr'])
        ingest(self.db,self.corpus,self.entry)
        with self.assertRaisesRegex(Rejected,'not_current_or_permitted'):
            validate_citations(self.db,CALLER,[citation])

    def test_cross_tenant_and_private_documents_never_enter_candidates(self):
        chunks=visible_chunks(self.db,CALLER)
        self.assertNotIn('hr-private',{c['doc_id'] for c in chunks})
        self.assertTrue(all(c['tenant']=='a' for c in chunks))
        b=Identity('b','alice')
        self.assertEqual({c['doc_id'] for c in visible_chunks(self.db,b)},{'b-secret'})

    def test_read_scope_is_required(self):
        with self.assertRaisesRegex(Rejected,'scope_denied'):
            retrieve(self.db,Identity('a','alice',frozenset()),'XR-200')

    def test_path_traversal_rejected(self):
        self.entry['path']='../test.db'
        with self.assertRaisesRegex(Rejected,'source_outside_corpus'):
            ingest(self.db,self.corpus,self.entry)

    def test_empty_and_bad_encoding_rejected(self):
        p=self.corpus/'empty.md';p.write_text('',encoding='utf-8')
        with self.assertRaisesRegex(Rejected,'empty_document'):parse(p)
        p.write_bytes(b'\xff\xfe')
        with self.assertRaisesRegex(Rejected,'invalid_utf8'):parse(p)

    def test_table_header_and_values_remain_together(self):
        chunks=parse(self.corpus/'limits.md',80)
        table=next(c['body'] for c in chunks if '| 城市类别 |' in c['body'])
        self.assertIn('一般员工',table)
        self.assertIn('元/人/晚',table)
        self.assertIn('| 一线城市 | 600 | 800 |',table)

    def test_quote_substitution_is_rejected(self):
        c=visible_chunks(self.db,CALLER)[0]
        with self.assertRaisesRegex(Rejected,'quote_not_in_source'):
            validate_citations(self.db,CALLER,[{'chunk_id':c['chunk_id'],'revision':c['revision'],'quote':'原文完全不存在的内容'}])

    def test_rrf_deduplicates_each_list(self):
        a={'chunk_id':'a'};b={'chunk_id':'b'}
        rows=rrf([[a,a],[b,a]],constant=0)
        self.assertEqual(rows[0]['chunk_id'],'a')
        self.assertAlmostEqual(rows[0]['score'],1.5)

    def test_multiple_gold_documents_and_no_answer_metrics(self):
        result=retrieval_metrics(['b','b','x'],['a','b'],3)
        self.assertEqual(result['hit'],1)
        self.assertEqual(result['recall'],0.5)
        self.assertEqual(result['mrr'],1)
        self.assertIsNone(retrieval_metrics([],[],3)['recall'])

    def test_invalid_limits_do_not_silently_expand_work(self):
        for k in (0,True,101):
            with self.assertRaises(Rejected):retrieve(self.db,CALLER,'问题',k=k)
        with self.assertRaisesRegex(Rejected,'dense_model_required'):
            retrieve(self.db,CALLER,'问题',mode='dense')

    def test_unapproved_action_cannot_execute(self):
        row=self.new_run()
        with self.assertRaisesRegex(Rejected,'approval_required'):
            execute(self.db,CALLER,row['run_id'])
        self.assertEqual(self.count('tickets'),0)

    def test_model_cannot_approve(self):
        row=self.new_run()
        with self.assertRaisesRegex(Rejected,'scope_denied'):
            approve(self.db,CALLER,row['run_id'],row['fingerprint'])

    def test_approval_bound_to_action(self):
        row=self.new_run()
        with self.assertRaisesRegex(Rejected,'does_not_match'):
            approve(self.db,OPERATOR,row['run_id'],'wrong')

    def test_duplicate_key_with_changed_payload_fails(self):
        self.new_run()
        with self.assertRaisesRegex(Rejected,'idempotency_key_conflict'):
            draft(self.db,CALLER,'operation-0001','不同动作','不同内容')

    def test_expired_approval_does_not_execute(self):
        row=self.approved_run()
        with connect(self.db,True) as con:
            con.execute('UPDATE runs SET approval_until=0 WHERE run_id=?',(row['run_id'],))
        with self.assertRaisesRegex(Rejected,'approval_expired'):
            execute(self.db,CALLER,row['run_id'])
        self.assertEqual(self.count('tickets'),0)

    def test_cancellation_before_execution(self):
        row=self.approved_run();cancel(self.db,CALLER,row['run_id'])
        with self.assertRaises(Rejected):execute(self.db,CALLER,row['run_id'])
        self.assertEqual(self.count('tickets'),0)

    def test_crash_before_effect_recovers(self):
        row=self.approved_run()
        with self.assertRaisesRegex(Rejected,'injected_before_effect'):
            execute(self.db,CALLER,row['run_id'],fault='before_effect')
        execute(self.db,CALLER,row['run_id'])
        self.assertEqual(self.count('tickets'),1)

    def test_lost_response_reconciles_even_after_approval_expired(self):
        row=self.approved_run()
        with self.assertRaisesRegex(Rejected,'injected_response_lost'):
            execute(self.db,CALLER,row['run_id'],fault='after_effect')
        with connect(self.db,True) as con:
            con.execute('UPDATE runs SET approval_until=0 WHERE run_id=?',(row['run_id'],))
        result=execute(self.db,CALLER,row['run_id'])
        self.assertEqual(result['status'],'created')
        self.assertEqual(self.count('tickets'),1)

    def test_concurrent_delivery_creates_one_ticket(self):
        row=self.approved_run()
        with ThreadPoolExecutor(max_workers=6) as pool:
            result=list(pool.map(lambda _:execute(self.db,CALLER,row['run_id']),range(12)))
        self.assertEqual(len({r['ticket_id'] for r in result}),1)
        self.assertEqual(self.count('tickets'),1)

    def test_other_user_cannot_replay_run(self):
        row=self.approved_run()
        with self.assertRaisesRegex(Rejected,'run_not_found'):
            execute(self.db,Identity('a','bob',CALLER.scopes),row['run_id'])

    def test_token_audience_expiry_and_revocation(self):
        token=issue_token(self.db,CALLER,'local-resource')
        self.assertIsNotNone(verify_token(self.db,token,'local-resource'))
        self.assertIsNone(verify_token(self.db,token,'wrong-resource'))
        self.assertIsNone(verify_token(self.db,issue_token(self.db,CALLER,'local-resource',-1),'local-resource'))
        with connect(self.db,True) as con:con.execute('UPDATE credentials SET revoked=1')
        self.assertIsNone(verify_token(self.db,token,'local-resource'))

    def test_agent_unknown_tool_cannot_create_side_effect(self):
        def model(messages,timeout):
            return {'role':'assistant','tool_calls':[{'function':{'name':'approve_ticket','arguments':{}}}]}
        with self.assertRaisesRegex(Rejected,'tool_not_allowed'):
            run(self.db,CALLER,'创建工单','agent-op-1',model)
        self.assertEqual(self.count('tickets'),0)

    def test_agent_repeated_search_stops(self):
        def model(messages,timeout):
            return {'role':'assistant','tool_calls':[{'function':{'name':'search_knowledge','arguments':{'query':'XR-200'}}}]}
        with self.assertRaisesRegex(Rejected,'repeated_tool_call'):
            run(self.db,CALLER,'查设备','agent-op-1',model)

    def test_agent_consumes_evidence_then_validates_citation(self):
        def model(messages,timeout):
            if messages[-1]['role']=='user':
                return {'role':'assistant','tool_calls':[{'function':{'name':'search_knowledge','arguments':{'query':'备份 backup'}}}]}
            c=json.loads(messages[-1]['content'])['evidence'][0]
            return {'role':'assistant','content':json.dumps({'answer':'以下是检索证据，须核对具体主张。','citations':[{'chunk_id':c['chunk_id'],'revision':c['revision'],'quote':c['body']}]})}
        result=run(self.db,CALLER,'怎样备份？','agent-op-1',model)
        self.assertEqual(result['rounds'],2)
        self.assertEqual(result['semantic_verification'],'requires_review')

    def test_agent_cannot_cite_unseen_document(self):
        c=visible_chunks(self.db,CALLER)[0]
        def model(messages,timeout):
            return {'role':'assistant','content':json.dumps({'answer':'声称正确','citations':[{'chunk_id':c['chunk_id'],'revision':c['revision'],'quote':c['body']}]})}
        with self.assertRaisesRegex(Rejected,'not_provided'):
            run(self.db,CALLER,'问题','agent-op-1',model)


if __name__=='__main__':
    unittest.main(verbosity=2)
