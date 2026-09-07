"""Real loopback HTTP, subprocess stdio, and process-restart framework tests.

Requires requirements.txt; it never contacts the fixture authorization issuer.
"""
import asyncio
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request
import httpx2
from mcp import Client, StdioServerParameters
from mcp.client.streamable_http import streamable_http_client
from core import Identity, connect, digest
from lab import CALLER, seed
from workflow import issue_token

HERE=Path(__file__).resolve().parent


class ProtocolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory()
        cls.db=Path(cls.temp.name)/'server.db'
        seed(cls.db)
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0))
            cls.port=sock.getsockname()[1]
        cls.url=f'http://127.0.0.1:{cls.port}/mcp'
        cls.log=open(Path(cls.temp.name)/'server.log','w',encoding='utf-8')
        cls.process=subprocess.Popen([sys.executable,'-X','utf8',str(HERE/'mcp_server.py'),'--db',str(cls.db),'--port',str(cls.port)],
            stdin=subprocess.DEVNULL,stdout=cls.log,stderr=cls.log,
            creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        deadline=time.monotonic()+20
        while time.monotonic()<deadline:
            try:
                with urllib.request.urlopen(cls.url.replace('/mcp','/.well-known/oauth-protected-resource/mcp'),timeout=1) as r:
                    cls.metadata=json.load(r)
                return
            except (OSError,urllib.error.URLError):
                if cls.process.poll() is not None:
                    break
                time.sleep(.1)
        cls.tearDownClass()
        raise RuntimeError('Local MCP server did not become ready')

    @classmethod
    def tearDownClass(cls):
        if cls.process.poll() is None:
            cls.process.terminate()
            cls.process.wait(timeout=10)
        cls.log.close()
        cls.temp.cleanup()

    def test_discovery_advertises_resource(self):
        self.assertEqual(self.metadata['resource'],self.url)
        self.assertIn('knowledge:read',self.metadata['scopes_supported'])

    def test_http_credentials_enforced_before_dispatch(self):
        missing_scope=Identity('a','alice',frozenset())
        revoked=issue_token(self.db,CALLER,self.url)
        with connect(self.db,True) as con:
            con.execute('UPDATE credentials SET revoked=1 WHERE token_hash=?',(digest(revoked),))
        cases=[None,'unknown',issue_token(self.db,CALLER,'wrong-audience'),
               issue_token(self.db,CALLER,self.url,-1),revoked,issue_token(self.db,missing_scope,self.url)]
        for token in cases:
            headers={'Content-Type':'application/json'}
            if token:headers['Authorization']='Bearer '+token
            request=urllib.request.Request(self.url,b'{}',headers)
            with self.assertRaises(urllib.error.HTTPError) as caught:
                urllib.request.urlopen(request,timeout=5)
            self.assertIn(caught.exception.code,(401,403))

    def test_modern_and_legacy_http_call_same_tool(self):
        async def check():
            for mode,expected in [('auto','2026-07-28'),('legacy','2025-11-25')]:
                token=issue_token(self.db,CALLER,self.url)
                async with httpx2.AsyncClient(headers={'Authorization':'Bearer '+token},timeout=10) as http:
                    async with Client(streamable_http_client(self.url,http_client=http),mode=mode,cache=None) as client:
                        listing=await client.list_tools()
                        self.assertNotIn('approve_ticket',[t.name for t in listing.tools])
                        result=await client.call_tool('search_knowledge',{'query':'薪酬核算基数','limit':3})
                        self.assertFalse(result.is_error)
                        self.assertEqual(client.protocol_version,expected)
                        self.assertTrue(all(c['doc_id'] not in ('hr-private','b-secret') for c in result.structured_content['evidence']))
                        denied=await client.call_tool('execute_ticket',{'run_id':'does-not-exist'})
                        self.assertTrue(denied.is_error)
                        bad=await client.call_tool('search_knowledge',{'query':'设备','limit':100})
                        self.assertTrue(bad.is_error)
                        # Revocation is checked on the next HTTP request, not only at connection.
                        with connect(self.db,True) as con:
                            con.execute('UPDATE credentials SET revoked=1 WHERE token_hash=?',(digest(token),))
                        with self.assertRaises(Exception):
                            await client.call_tool('search_knowledge',{'query':'设备'})
        asyncio.run(check())

    def test_stdio_subprocess_current_and_legacy(self):
        async def check():
            for mode,expected in [('auto','2026-07-28'),('legacy','2025-11-25')]:
                params=StdioServerParameters(command=sys.executable,
                    args=['-X','utf8',str(HERE/'mcp_server.py'),'--db',str(self.db),'--stdio'],
                    env={k:v for k,v in os.environ.items() if k in {'PATH','SYSTEMROOT','WINDIR','PYTHONPATH','PYTHONUTF8'}})
                async with Client(params,mode=mode,read_timeout_seconds=10) as client:
                    result=await client.call_tool('search_knowledge',{'query':'备份'})
                    self.assertFalse(result.is_error)
                    self.assertEqual(client.protocol_version,expected)
        asyncio.run(check())

    def test_framework_recovers_in_new_process(self):
        with tempfile.TemporaryDirectory() as tmp:
            db=Path(tmp)/'workflow.db'
            checkpoint=Path(tmp)/'checkpoint.db'
            cmd=[sys.executable,'-X','utf8',str(HERE/'framework.py'),'--db',str(db),
                 '--checkpoints',str(checkpoint),'--thread','restart-test-0001']
            first=subprocess.run(cmd,capture_output=True,text=True,encoding='utf-8',timeout=20)
            self.assertEqual(first.returncode,0,first.stderr)
            self.assertIn('__interrupt__',json.loads(first.stdout))
            second=subprocess.run(cmd+['--resume','yes'],capture_output=True,text=True,encoding='utf-8',timeout=20)
            self.assertEqual(second.returncode,0,second.stderr)
            self.assertEqual(json.loads(second.stdout)['result']['status'],'created')
            with connect(db) as con:
                self.assertEqual(con.execute('SELECT count(*) FROM tickets').fetchone()[0],1)


if __name__=='__main__':
    unittest.main(verbosity=2)
