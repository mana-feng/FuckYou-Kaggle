"""Durable approval + idempotent simulated remote effect, including response-loss recovery."""
import secrets
import time
from core import Identity, Rejected, canonical, connect, digest


def event(con, run_id, kind, detail):
    con.execute("INSERT INTO events(run_id,kind,detail,created) VALUES(?,?,?,?)", (run_id, kind, canonical(detail), time.time()))


def draft(db, identity, operation_id, title, body):
    if "tickets:draft" not in identity.scopes:
        raise Rejected("scope_denied")
    if not isinstance(operation_id, str) or not 8 <= len(operation_id) <= 100:
        raise Rejected("invalid_operation_id")
    if not isinstance(title, str) or not 1 <= len(title.strip()) <= 120 or not isinstance(body, str) or not 1 <= len(body.strip()) <= 3000:
        raise Rejected("invalid_ticket")
    action = {"tool": "create_ticket", "title": title, "body": body}
    fingerprint = digest(canonical(action))
    # Tenant and subject scope the client's key; a different caller cannot replay its result.
    run_id = digest(canonical([identity.tenant, identity.subject, operation_id]))
    with connect(db, True) as con:
        old = con.execute("SELECT * FROM runs WHERE run_id=?", (run_id,)).fetchone()
        if old:
            if old["fingerprint"] != fingerprint:
                raise Rejected("idempotency_key_conflict")
            return dict(old)
        con.execute("INSERT INTO runs VALUES(?,?,?,?,?, 'pending',NULL,NULL,NULL,?)", (run_id, identity.tenant, identity.subject, canonical(action), fingerprint, time.time()))
        event(con, run_id, "drafted", {"fingerprint": fingerprint})
        return dict(con.execute("SELECT * FROM runs WHERE run_id=?", (run_id,)).fetchone())


def approve(db, approver, run_id, expected_fingerprint, ttl=300):
    if "tickets:approve" not in approver.scopes:
        raise Rejected("scope_denied")
    if type(ttl) is not int or not 1 <= ttl <= 3600:
        raise Rejected("invalid_approval_ttl")
    with connect(db, True) as con:
        row = con.execute("SELECT * FROM runs WHERE run_id=? AND tenant=?", (run_id, approver.tenant)).fetchone()
        if row is None:
            raise Rejected("run_not_found")
        if row["fingerprint"] != expected_fingerprint:
            raise Rejected("approval_does_not_match_action")
        if row["status"] != "pending":
            raise Rejected("run_not_pending")
        con.execute("UPDATE runs SET status='approved',approval_by=?,approval_until=? WHERE run_id=?", (approver.subject, time.time() + ttl, run_id))
        event(con, run_id, "approved", {"by": approver.subject, "fingerprint": expected_fingerprint})


def cancel(db, identity, run_id):
    with connect(db, True) as con:
        row = con.execute("SELECT * FROM runs WHERE run_id=? AND tenant=? AND subject=?", (run_id, identity.tenant, identity.subject)).fetchone()
        if row is None:
            raise Rejected("run_not_found")
        if row["status"] not in {"pending", "approved"}:
            raise Rejected("execution_may_have_started_reconcile_first")
        con.execute("UPDATE runs SET status='cancelled' WHERE run_id=?", (run_id,))
        event(con, run_id, "cancelled", {})


def downstream_create(db, row):
    """Simulated external system: its own transaction and UNIQUE operation id.

    Real adapters must use the downstream system's idempotency/query contract.
    One local SQLite transaction cannot atomically encompass a remote request.
    """
    import json
    action = json.loads(row["action"])
    with connect(db, True) as con:
        con.execute("INSERT OR IGNORE INTO tickets VALUES(?,?,?,?,?,?)", (row["run_id"], row["tenant"], row["subject"], action["title"], action["body"], time.time()))
        return {"ticket_id": row["run_id"], "status": "created"}


def execute(db, identity, run_id, fault=None):
    import json
    if "tickets:execute" not in identity.scopes:
        raise Rejected("scope_denied")
    with connect(db, True) as con:
        row = con.execute("SELECT * FROM runs WHERE run_id=? AND tenant=? AND subject=?", (run_id, identity.tenant, identity.subject)).fetchone()
        if row is None:
            raise Rejected("run_not_found")
        row = dict(row)
        if row["status"] == "completed":
            return json.loads(row["result"])
        if row["status"] == "executing":
            # Query the downstream before retrying; do not assume timeout means no effect.
            ticket = con.execute("SELECT operation_id FROM tickets WHERE operation_id=? AND tenant=?", (run_id, identity.tenant)).fetchone()
            if ticket:
                result = {"ticket_id": run_id, "status": "created"}
                con.execute("UPDATE runs SET status='completed',result=? WHERE run_id=?", (canonical(result), run_id))
                event(con, run_id, "reconciled", result)
                return result
        elif row["status"] != "approved":
            raise Rejected("approval_required")
        if not row["approval_until"] or row["approval_until"] <= time.time():
            raise Rejected("approval_expired")
        if digest(row["action"]) != row["fingerprint"]:
            raise Rejected("action_changed")
        con.execute("UPDATE runs SET status='executing' WHERE run_id=?", (run_id,))
        event(con, run_id, "execution_started", {"fingerprint": row["fingerprint"]})
    if fault == "before_effect":
        raise Rejected("injected_before_effect")
    result = downstream_create(db, row)  # Separate commit, deliberately outside run transaction.
    if fault == "after_effect":
        raise Rejected("injected_response_lost")
    with connect(db, True) as con:
        con.execute("UPDATE runs SET status='completed',result=? WHERE run_id=?", (canonical(result), run_id))
        event(con, run_id, "completed", result)
    return result


def issue_token(db, identity, audience, ttl=600):
    """Local opaque-token fixture; NOT an OAuth authorization server."""
    raw = secrets.token_urlsafe(32)
    with connect(db, True) as con:
        con.execute("INSERT INTO credentials VALUES(?,?,?,?,?,?,0)", (digest(raw), identity.subject, identity.tenant, canonical(sorted(identity.scopes)), audience, int(time.time()) + ttl))
    return raw


def verify_token(db, raw, audience):
    import json
    if not isinstance(raw, str):
        return None
    with connect(db) as con:
        row = con.execute("SELECT * FROM credentials WHERE token_hash=?", (digest(raw),)).fetchone()
    if row is None or row["revoked"] or row["expires"] <= time.time() or row["audience"] != audience:
        return None
    return {**dict(row), "scopes": json.loads(row["scopes"])}
