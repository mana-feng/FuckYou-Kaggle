"""Small, inspectable retrieval baseline. SQLite is authoritative; no hidden LLM calls."""
from collections import Counter
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
import hashlib
import json
import math
import re
import sqlite3
import time


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class Identity:
    tenant: str
    subject: str
    scopes: frozenset = frozenset({"knowledge:read"})


class Rejected(ValueError):
    """An expected, externally safe application error."""


@contextmanager
def connect(db, write=False):
    db = Path(db)
    db.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(db, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    con.execute("PRAGMA busy_timeout=10000")
    try:
        if write:
            con.execute("BEGIN IMMEDIATE")
        yield con
        con.commit()
    except BaseException:
        con.rollback()
        raise
    finally:
        con.close()


def init(db):
    with connect(db) as con:
        con.execute("PRAGMA journal_mode=WAL")
        con.executescript("""
        CREATE TABLE IF NOT EXISTS documents(
            tenant TEXT NOT NULL, doc_id TEXT NOT NULL, revision INTEGER NOT NULL,
            fingerprint TEXT NOT NULL, title TEXT NOT NULL, source TEXT NOT NULL,
            readers TEXT NOT NULL, status TEXT NOT NULL,
            PRIMARY KEY(tenant,doc_id));
        CREATE TABLE IF NOT EXISTS chunks(
            chunk_id TEXT PRIMARY KEY, tenant TEXT NOT NULL, doc_id TEXT NOT NULL,
            revision INTEGER NOT NULL, section TEXT NOT NULL, page INTEGER,
            body TEXT NOT NULL, ordinal INTEGER NOT NULL,
            FOREIGN KEY(tenant,doc_id) REFERENCES documents(tenant,doc_id));
        CREATE TABLE IF NOT EXISTS jobs(
            job_id TEXT PRIMARY KEY, tenant TEXT NOT NULL, doc_id TEXT NOT NULL,
            revision INTEGER NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL,
            error_code TEXT, updated REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS runs(
            run_id TEXT PRIMARY KEY, tenant TEXT NOT NULL, subject TEXT NOT NULL,
            action TEXT NOT NULL, fingerprint TEXT NOT NULL, status TEXT NOT NULL,
            approval_by TEXT, approval_until REAL, result TEXT, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS tickets(
            operation_id TEXT PRIMARY KEY, tenant TEXT NOT NULL, subject TEXT NOT NULL,
            title TEXT NOT NULL, body TEXT NOT NULL, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS events(
            event_id INTEGER PRIMARY KEY, run_id TEXT NOT NULL, kind TEXT NOT NULL,
            detail TEXT NOT NULL, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS credentials(
            token_hash TEXT PRIMARY KEY, subject TEXT NOT NULL, tenant TEXT NOT NULL,
            scopes TEXT NOT NULL, audience TEXT NOT NULL, expires INTEGER NOT NULL,
            revoked INTEGER NOT NULL DEFAULT 0);
        """)


def tokenize(text):
    # Preserve model numbers; use Chinese unigrams/bigrams as a transparent baseline.
    parts = re.findall(r"[a-z0-9]+(?:[-_.][a-z0-9]+)*|[\u4e00-\u9fff]+", text.lower())
    result = []
    for part in parts:
        if re.fullmatch(r"[\u4e00-\u9fff]+", part):
            result.extend(part)
            result.extend(part[i:i + 2] for i in range(len(part) - 1))
        else:
            result.append(part)
    return result


def parse(path, chunk_chars=450):
    """Return provenance-bearing chunks; reject unsupported/empty extraction explicitly.

    chunk_chars counts characters, NOT model tokens. Whole tables are kept together.
    Text PDF extraction is a baseline, not an OCR/layout parser.
    """
    path = Path(path)
    if not 80 <= chunk_chars <= 8000:
        raise Rejected("invalid_chunk_chars")
    if path.stat().st_size > 8_000_000:
        raise Rejected("file_too_large")
    if path.suffix.lower() == ".pdf":
        from pypdf import PdfReader
        try:
            reader = PdfReader(path)
            if reader.is_encrypted:
                raise Rejected("encrypted_pdf")
            pages = [(i + 1, p.extract_text() or "") for i, p in enumerate(reader.pages)]
        except Rejected:
            raise
        except Exception as exc:
            raise Rejected("invalid_pdf") from exc
        if not pages or any(len(t.strip()) < 20 for _, t in pages):
            raise Rejected("needs_ocr_or_page_review")
    elif path.suffix.lower() in {".md", ".txt"}:
        try:
            pages = [(None, path.read_text(encoding="utf-8"))]
        except UnicodeError as exc:
            raise Rejected("invalid_utf8") from exc
    else:
        raise Rejected("unsupported_format")
    chunks = []
    for page, text in pages:
        if "\ufffd" in text:
            raise Rejected("replacement_character")
        section = path.stem
        preceding = ""
        for block in re.split(r"\n\s*\n", text):
            block = block.strip()
            if not block:
                continue
            heading = re.match(r"^(#{1,6})\s+([^\n]+)(?:\n(.*))?$", block, re.S)
            if heading:
                section = heading[2].strip()
                preceding = ""
                block = (heading[3] or "").strip()
                if not block:
                    continue
            if block.startswith("|"):
                table = (preceding + "\n\n" if preceding else "") + block
                if len(table) > 8000:
                    raise Rejected("table_requires_row_chunking")
                pieces = [table]  # Keep the immediately preceding caption/units with the table.
            else:
                sentences = re.split(r"(?<=[。！？.!?])\s*|\n", block)
                pieces, pending = [], ""
                for sentence in filter(None, sentences):
                    if pending and len(pending) + len(sentence) + 1 > chunk_chars:
                        pieces.append(pending)
                        pending = ""
                    # A single long sentence is split with explicit provenance retained.
                    while len(sentence) > chunk_chars:
                        if pending:
                            pieces.append(pending)
                            pending = ""
                        pieces.append(sentence[:chunk_chars])
                        sentence = sentence[chunk_chars:]
                    pending += ("\n" if pending else "") + sentence
                if pending:
                    pieces.append(pending)
            preceding = block if len(block) <= chunk_chars else ""
            chunks.extend({"section": section, "page": page, "body": p} for p in pieces if p)
    if not chunks:
        raise Rejected("empty_document")
    return chunks


def ingest(db, root, entry, chunk_chars=450, fault=None):
    """Trusted admin ingestion, one doc per atomic publication. Lower revisions never win."""
    required = {"tenant", "doc_id", "revision", "title", "path", "readers"}
    if set(entry) != required or type(entry["revision"]) is not int or entry["revision"] < 1:
        raise Rejected("invalid_manifest")
    if not all(isinstance(entry[k], str) and entry[k] for k in ("tenant", "doc_id", "title", "path")):
        raise Rejected("invalid_manifest")
    if not isinstance(entry["readers"], list) or not all(isinstance(x, str) and x for x in entry["readers"]):
        raise Rejected("invalid_readers")
    root = Path(root).resolve()
    path = (root / entry["path"]).resolve()
    if not path.is_relative_to(root):
        raise Rejected("source_outside_corpus")
    if path.stat().st_size > 8_000_000:
        raise Rejected("file_too_large")
    # The manifest is authored by an administrator, never by the model or uploaded file.
    raw_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    fingerprint = digest(canonical({**entry, "raw_hash": raw_hash, "chunk_chars": chunk_chars, "parser": "2"}))
    job_id = digest(canonical([entry["tenant"], entry["doc_id"], entry["revision"], fingerprint]))
    with connect(db, True) as con:
        con.execute("""INSERT INTO jobs VALUES(?,?,?,?, 'running',1,NULL,?)
                       ON CONFLICT(job_id) DO UPDATE SET status='running',attempts=attempts+1,updated=excluded.updated""",
                    (job_id, entry["tenant"], entry["doc_id"], entry["revision"], time.time()))
    try:
        pieces = parse(path, chunk_chars)
        if fault == "after_parse":
            raise Rejected("injected_after_parse")
        with connect(db, True) as con:
            old = con.execute("SELECT * FROM documents WHERE tenant=? AND doc_id=?", (entry["tenant"], entry["doc_id"])).fetchone()
            if old and entry["revision"] < old["revision"]:
                state = "stale"
            elif old and entry["revision"] == old["revision"]:
                if old["fingerprint"] != fingerprint or old["status"] != "active":
                    raise Rejected("revision_conflict")
                state = "unchanged"
            else:
                con.execute("""INSERT INTO documents VALUES(?,?,?,?,?,?,?, 'active')
                    ON CONFLICT(tenant,doc_id) DO UPDATE SET revision=excluded.revision,
                    fingerprint=excluded.fingerprint,title=excluded.title,source=excluded.source,
                    readers=excluded.readers,status='active'""",
                    (entry["tenant"], entry["doc_id"], entry["revision"], fingerprint,
                     entry["title"], entry["path"], canonical(entry["readers"])))
                con.execute("DELETE FROM chunks WHERE tenant=? AND doc_id=?", (entry["tenant"], entry["doc_id"]))
                for i, piece in enumerate(pieces):
                    chunk_id = digest(canonical([entry["tenant"], entry["doc_id"], entry["revision"], i, piece]))
                    con.execute("INSERT INTO chunks VALUES(?,?,?,?,?,?,?,?)", (chunk_id, entry["tenant"], entry["doc_id"], entry["revision"], piece["section"], piece["page"], piece["body"], i))
                if fault == "before_commit":
                    raise Rejected("injected_before_commit")
                state = "published"
            con.execute("UPDATE jobs SET status=?,error_code=NULL,updated=? WHERE job_id=?", (state, time.time(), job_id))
        return {"job_id": job_id, "status": state, "chunks": len(pieces)}
    except Exception as exc:
        with connect(db, True) as con:
            con.execute("UPDATE jobs SET status='failed',error_code=?,updated=? WHERE job_id=?", (str(exc) if isinstance(exc, Rejected) else type(exc).__name__, time.time(), job_id))
        raise


def delete_document(db, tenant, doc_id, revision):
    """Trusted administrative operation. Tombstone prevents delayed jobs resurrecting data."""
    with connect(db, True) as con:
        row = con.execute("SELECT revision,status FROM documents WHERE tenant=? AND doc_id=?", (tenant, doc_id)).fetchone()
        if row is None:
            raise Rejected("document_not_found")
        if type(revision) is not int or revision <= row["revision"]:
            raise Rejected("revision_must_increase")
        con.execute("UPDATE documents SET revision=?,status='deleted',readers='[]' WHERE tenant=? AND doc_id=?", (revision, tenant, doc_id))
        con.execute("DELETE FROM chunks WHERE tenant=? AND doc_id=?", (tenant, doc_id))


def visible_chunks(db, identity):
    if "knowledge:read" not in identity.scopes:
        raise Rejected("scope_denied")
    with connect(db) as con:
        rows = con.execute("""SELECT c.*,d.title,d.source,d.readers FROM chunks c JOIN documents d
            ON c.tenant=d.tenant AND c.doc_id=d.doc_id AND c.revision=d.revision
            WHERE d.tenant=? AND d.status='active' ORDER BY c.doc_id,c.ordinal""", (identity.tenant,)).fetchall()
    return [dict(r) for r in rows if identity.subject in json.loads(r["readers"]) or "*" in json.loads(r["readers"])]


def bm25(query, chunks, k1=1.2, b=0.75):
    if k1 <= 0 or not 0 <= b <= 1 or not math.isfinite(k1 + b):
        raise Rejected("invalid_bm25_configuration")
    counters = [Counter(tokenize(c["title"] + " " + c["section"] + " " + c["body"])) for c in chunks]
    n = len(counters)
    if not n:
        return []
    avg = sum(sum(c.values()) for c in counters) / n or 1
    dfs = Counter(t for c in counters for t in c)
    result = []
    for chunk, counts in zip(chunks, counters):
        score = 0.0
        for term in set(tokenize(query)):
            tf = counts[term]
            idf = math.log(1 + (n - dfs[term] + 0.5) / (dfs[term] + 0.5))
            score += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * sum(counts.values()) / avg))
        if score > 0:
            result.append({**chunk, "score": score})
    return sorted(result, key=lambda c: (-c["score"], c["chunk_id"]))


def rrf(rankings, constant=60):
    if type(constant) is not int or constant < 0:
        raise Rejected("invalid_rrf_constant")
    scores, chunks = Counter(), {}
    for ranking in rankings:
        seen = set()
        for rank, chunk in enumerate(ranking, 1):
            key = chunk["chunk_id"]
            if key not in seen:
                scores[key] += 1 / (constant + rank)
                chunks[key] = chunk
                seen.add(key)
    return [{**chunks[key], "score": score} for key, score in sorted(scores.items(), key=lambda x: (-x[1], x[0]))]


def retrieve(db, identity, query, *, mode="bm25", k=3, candidate_k=12, model=None, reranker=None, context_chars=2400):
    if not isinstance(query, str) or not query.strip() or len(query) > 2000:
        raise Rejected("invalid_query")
    if type(k) is not int or type(candidate_k) is not int or not 1 <= k <= candidate_k <= 100:
        raise Rejected("invalid_candidate_limits")
    if not 200 <= context_chars <= 20000:
        raise Rejected("invalid_context_budget")
    if mode not in {"bm25", "dense", "hybrid"}:
        raise Rejected("invalid_retrieval_mode")
    start = time.perf_counter()
    chunks = visible_chunks(db, identity)  # All branches see the same authorized corpus.
    lexical = bm25(query, chunks)[:candidate_k]
    dense = []
    if mode != "bm25":
        if model is None:
            raise Rejected("dense_model_required")
        dense = model.rank(query, chunks)[:candidate_k]
    fused = lexical if mode == "bm25" else dense if mode == "dense" else rrf([lexical, dense])[:candidate_k]
    ranked = reranker.rank(query, fused) if reranker and fused else fused
    context, seen, size = [], set(), 0
    for item in ranked:
        key = digest(item["body"])
        length = len(item["title"]) + len(item["section"]) + len(item["body"]) + 100
        if key not in seen and size + length <= context_chars:
            context.append(item)
            size += length
            seen.add(key)
        if len(context) == k:
            break
    # A BM25 score/RRF score is not a confidence probability. This baseline exposes evidence.
    return {"query": query, "mode": mode, "candidates": {
                "bm25": [{"id": c["chunk_id"], "score": c["score"]} for c in lexical],
                "dense": [{"id": c["chunk_id"], "score": c["score"]} for c in dense],
                "final": [{"id": c["chunk_id"], "score": c["score"]} for c in ranked]},
            "context": context, "context_chars": size, "elapsed_ms": (time.perf_counter() - start) * 1000,
            "status": "evidence" if context else "insufficient_evidence"}


def validate_citations(db, identity, citations):
    """Structural/provenance check only. It does NOT prove the claim follows from the quote."""
    accessible = {c["chunk_id"]: c for c in visible_chunks(db, identity)}
    if not citations:
        raise Rejected("citations_required")
    for citation in citations:
        if not isinstance(citation, dict) or set(citation) != {"chunk_id", "revision", "quote"}:
            raise Rejected("invalid_citation")
        c = accessible.get(citation["chunk_id"])
        quote = citation["quote"]
        if c is None or c["revision"] != citation["revision"]:
            raise Rejected("citation_not_current_or_permitted")
        if not isinstance(quote, str) or len(quote.strip()) < 4 or quote not in c["body"]:
            raise Rejected("quote_not_in_source")
    return True


def retrieval_metrics(actual_ids, gold_ids, k):
    if type(k) is not int or k < 1:
        raise Rejected("invalid_k")
    ranked = list(dict.fromkeys(actual_ids))[:k]
    gold = set(gold_ids)
    if not gold:  # No-answer questions must be evaluated separately, not assigned Recall=1.
        return {"hit": None, "recall": None, "mrr": None, "ndcg": None}
    relevance = [int(x in gold) for x in ranked]
    hit = sum(relevance)
    dcg = sum(v / math.log2(i + 2) for i, v in enumerate(relevance))
    ideal = sum(1 / math.log2(i + 2) for i in range(min(k, len(gold))))
    return {"hit": float(hit > 0), "recall": hit / len(gold),
            "mrr": next((1 / (i + 1) for i, v in enumerate(relevance) if v), 0), "ndcg": dcg / ideal}
