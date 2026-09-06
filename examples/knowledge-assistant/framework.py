"""A durable LangGraph exercise. No LLM call is hidden inside this deterministic graph."""
import argparse
import json
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command, interrupt
from langgraph.checkpoint.sqlite import SqliteSaver
from core import Identity, Rejected, init
from workflow import draft, approve, execute


class State(TypedDict, total=False):
    operation_id: str
    title: str
    body: str
    run_id: str
    fingerprint: str
    approved: bool
    result: dict


def build(db, saver):
    caller = Identity('a', 'alice', frozenset({'knowledge:read', 'tickets:draft', 'tickets:execute'}))

    def prepare(state):
        row = draft(db, caller, state['operation_id'], state['title'], state['body'])
        return {'run_id': row['run_id'], 'fingerprint': row['fingerprint']}

    def approval(state):
        # This node restarts on resume. No non-idempotent side effect appears before interrupt.
        answer = interrupt({'run_id': state['run_id'], 'fingerprint': state['fingerprint'],
                            'title': state['title'], 'body': state['body']})
        if not isinstance(answer, dict) or type(answer.get('approved')) is not bool:
            raise Rejected('invalid_approval_response')
        return {'approved': answer['approved']}

    def commit(state):
        if not state['approved']:
            return {'result': {'status': 'declined'}}
        # A graph resume value does not authorize the action: the business service rechecks.
        return {'result': execute(db, caller, state['run_id'])}

    graph = StateGraph(State)
    graph.add_node('prepare', prepare)
    graph.add_node('approval', approval)
    graph.add_node('commit', commit)
    graph.add_edge(START, 'prepare')
    graph.add_edge('prepare', 'approval')
    graph.add_edge('approval', 'commit')
    graph.add_edge('commit', END)
    return graph.compile(checkpointer=saver)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--db', required=True)
    p.add_argument('--checkpoints', required=True)
    p.add_argument('--thread', default='demo-thread')
    p.add_argument('--resume', choices=['yes', 'no'])
    args = p.parse_args()
    init(args.db)
    config = {'configurable': {'thread_id': args.thread}, 'recursion_limit': 8}
    with SqliteSaver.from_conn_string(args.checkpoints) as saver:
        graph = build(args.db, saver)
        if args.resume:
            state = graph.get_state(config)
            if not state.next:
                raise SystemExit('No pending node to resume; use a new thread id for a new run.')
            if args.resume == 'yes':
                # Local operator fixture. In a product, authenticate this as a separate user action.
                from core import connect
                with connect(args.db) as con:
                    row = con.execute('SELECT status FROM runs WHERE run_id=?', (state.values['run_id'],)).fetchone()
                if row['status'] == 'pending':
                    approve(args.db, Identity('a', 'operator', frozenset({'tickets:approve'})), state.values['run_id'], state.values['fingerprint'])
            output = graph.invoke(Command(resume={'approved': args.resume == 'yes'}), config)
        else:
            if graph.get_state(config).values:
                raise SystemExit('Thread already exists; resume it or choose a new thread id.')
            output = graph.invoke({'operation_id': args.thread, 'title': 'XR-200 功率核查', 'body': '请按当前型号手册核对设备标签。'}, config)
        print(json.dumps(output, ensure_ascii=False, indent=2, default=str))
