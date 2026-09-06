"""Optional CPU neural retrieval. Downloads happen only when explicitly constructed."""
from pathlib import Path
import hashlib
import json
import math
from core import Rejected, canonical, digest

EMBED_MODEL = "BAAI/bge-small-zh-v1.5"
QUERY_PREFIX = "为这个句子生成表示以用于检索相关文章："
RERANK_MODEL = "Xenova/ms-marco-MiniLM-L-6-v2"


class Dense:
    def __init__(self, cache_dir):
        from fastembed import TextEmbedding
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.model = TextEmbedding(model_name=EMBED_MODEL, cache_dir=str(self.cache_dir / 'weights'), threads=2)
        # Weight digest prevents cached vectors surviving an unrecorded upstream model update.
        h = hashlib.sha256()
        for path in sorted((self.cache_dir / 'weights').rglob('*')):
            if path.is_file() and path.suffix in {'.onnx', '.json', '.txt'}:
                h.update(path.name.encode())
                with path.open('rb') as stream:
                    for block in iter(lambda: stream.read(1024 * 1024), b''):
                        h.update(block)
        self.version = EMBED_MODEL + ':' + h.hexdigest()
        self.vectors = {}

    def embed(self, texts):
        vectors = []
        for v in self.model.embed(texts, batch_size=16):
            v = [float(x) for x in v]
            norm = math.sqrt(sum(x * x for x in v))
            if len(v) != 512 or not norm or not all(math.isfinite(x) for x in v):
                raise Rejected('invalid_embedding')
            vectors.append([x / norm for x in v])
        return vectors

    def rank(self, query, chunks):
        if not chunks:
            return []
        # Corpus hash + model digest. Cache contains vectors only, not plaintext documents.
        key = digest(canonical([self.version, [(c['chunk_id'], c['title'], c['section'], c['body']) for c in chunks]]))
        if key in self.vectors:
            vectors = self.vectors[key]
        else:
            vectors = self.embed([c['title'] + '\n' + c['section'] + '\n' + c['body'] for c in chunks])
            self.vectors = {key: vectors}  # Drop the previous authorized snapshot; no derived-data disk cache.
        q = self.embed([QUERY_PREFIX + query])[0]
        result = [{**c, 'score': sum(x * y for x, y in zip(v, q))} for c, v in zip(chunks, vectors)]
        return sorted(result, key=lambda c: (-c['score'], c['chunk_id']))


class Reranker:
    def __init__(self, cache_dir, model_name=RERANK_MODEL):
        from fastembed.rerank.cross_encoder import TextCrossEncoder
        self.model_name = model_name
        self.model = TextCrossEncoder(model_name=model_name, cache_dir=str(cache_dir), threads=2)

    def rank(self, query, candidates):
        scores = list(self.model.rerank(query, [c['title'] + '\n' + c['body'] for c in candidates], batch_size=8))
        if len(scores) != len(candidates) or not all(math.isfinite(float(x)) for x in scores):
            raise Rejected('invalid_reranker_scores')
        return sorted([{**c, 'score': float(s)} for c, s in zip(candidates, scores)], key=lambda c: (-c['score'], c['chunk_id']))
