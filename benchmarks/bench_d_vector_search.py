"""
Benchmark D — pgvector Retrieval Latency
==========================================
Measures embedding generation + pgvector cosine-distance retrieval
separately, using the real app code.

Also runs EXPLAIN ANALYZE to show the query plan.

Run from repo root:
    cd e:\AgentFlow\backend
    ..\venv\Scripts\python.exe ..\benchmarks\bench_d_vector_search.py
"""
import sys, os, time, statistics, json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
os.chdir(Path(__file__).parent.parent / "backend")

from dotenv import load_dotenv
load_dotenv()

from app.rag.embeddings import generate_embedding
from app.db.database import engine
from sqlalchemy import text

QUERIES = [
    "What is machine learning?",
    "Explain the concept of neural networks",
    "How does gradient descent work?",
    "What are the key findings of this document?",
    "Describe the main methodology used",
    "What is the conclusion of this research?",
    "List the important technical details",
    "How is the system architecture designed?",
    "What are the performance metrics?",
    "Explain the data processing pipeline",
]
TOP_K = 5
N_WARMUP = 3
N_BENCH = 20  # repeat the full query list this many times → 200 total retrievals

def percentile(data, p):
    if not data:
        return float("nan")
    s = sorted(data)
    k = (len(s) - 1) * p / 100
    f = int(k)
    c = min(f + 1, len(s) - 1)
    return s[f] + (k - f) * (s[c] - s[f])

def count_vectors():
    with engine.connect() as conn:
        r = conn.execute(text("SELECT COUNT(*) FROM document_chunks"))
        return r.scalar()

def get_embedding_dim():
    with engine.connect() as conn:
        r = conn.execute(text(
            "SELECT array_length(embedding::real[], 1) FROM document_chunks LIMIT 1"
        ))
        row = r.fetchone()
        return row[0] if row else None

def check_index():
    with engine.connect() as conn:
        r = conn.execute(text("""
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'document_chunks'
        """))
        return r.fetchall()

def run_explain_analyze(embedding_str):
    sql = """
        EXPLAIN ANALYZE
        SELECT content, embedding <-> CAST(:emb AS vector) AS distance
        FROM document_chunks
        ORDER BY embedding <-> CAST(:emb AS vector)
        LIMIT 5
    """
    with engine.connect() as conn:
        r = conn.execute(text(sql), {"emb": embedding_str})
        return "\n".join(row[0] for row in r.fetchall())

if __name__ == "__main__":
    n_vectors = count_vectors()
    emb_dim = get_embedding_dim()
    indexes = check_index()
    print(f"Vector count:      {n_vectors}")
    print(f"Embedding dim:     {emb_dim}")
    print(f"Indexes:           {[(idx[0], idx[1][:80]) for idx in indexes]}")

    if n_vectors == 0:
        print("\nWARNING: No vectors in DB. Run bench_a first to insert documents.")
        sys.exit(1)

    embed_latencies = []
    retrieval_latencies = []
    e2e_latencies = []

    # Warmup
    print(f"\nWarming up ({N_WARMUP} queries)...")
    for q in QUERIES[:N_WARMUP]:
        emb = generate_embedding(q)
        emb_str = "[" + ",".join(map(str, emb)) + "]"
        sql = text("""
            SELECT content, embedding <-> CAST(:emb AS vector) AS distance
            FROM document_chunks ORDER BY embedding <-> CAST(:emb AS vector) LIMIT :k
        """)
        with engine.connect() as conn:
            conn.execute(sql, {"emb": emb_str, "k": TOP_K}).fetchall()

    # EXPLAIN ANALYZE on first real query
    print("\nEXPLAIN ANALYZE:")
    sample_emb = generate_embedding(QUERIES[0])
    sample_emb_str = "[" + ",".join(map(str, sample_emb)) + "]"
    explain_output = run_explain_analyze(sample_emb_str)
    print(explain_output)

    # Benchmark
    print(f"\nRunning {N_BENCH} iterations × {len(QUERIES)} queries = {N_BENCH*len(QUERIES)} retrievals...")
    for _ in range(N_BENCH):
        for q in QUERIES:
            t_e2e_start = time.perf_counter()

            # Stage 1: embedding
            t0 = time.perf_counter()
            emb = generate_embedding(q)
            t_embed = (time.perf_counter() - t0) * 1000
            embed_latencies.append(t_embed)

            # Stage 2: pgvector retrieval
            emb_str = "[" + ",".join(map(str, emb)) + "]"
            sql = text("""
                SELECT content, embedding <-> CAST(:emb AS vector) AS distance
                FROM document_chunks ORDER BY embedding <-> CAST(:emb AS vector) LIMIT :k
            """)
            t1 = time.perf_counter()
            with engine.connect() as conn:
                rows = conn.execute(sql, {"emb": emb_str, "k": TOP_K}).fetchall()
            t_retrieval = (time.perf_counter() - t1) * 1000
            retrieval_latencies.append(t_retrieval)

            t_e2e = (time.perf_counter() - t_e2e_start) * 1000
            e2e_latencies.append(t_e2e)

    def stats(name, data):
        d = {
            "n": len(data),
            "min_ms": min(data), "mean_ms": statistics.mean(data),
            "median_ms": statistics.median(data),
            "p50_ms": percentile(data, 50), "p95_ms": percentile(data, 95),
            "p99_ms": percentile(data, 99), "max_ms": max(data),
            "stdev_ms": statistics.stdev(data) if len(data) > 1 else 0,
        }
        print(f"\n--- {name} ---")
        print(f"  n={d['n']}")
        print(f"  min   = {d['min_ms']:.2f}ms")
        print(f"  mean  = {d['mean_ms']:.2f}ms")
        print(f"  p50   = {d['p50_ms']:.2f}ms")
        print(f"  p95   = {d['p95_ms']:.2f}ms")
        print(f"  p99   = {d['p99_ms']:.2f}ms")
        print(f"  max   = {d['max_ms']:.2f}ms")
        print(f"  stdev = {d['stdev_ms']:.2f}ms")
        return d

    print("\n" + "="*60)
    print("BENCHMARK D — VECTOR SEARCH LATENCY")
    print("="*60)
    print(f"Vector count:    {n_vectors}")
    print(f"Embedding dim:   {emb_dim}")
    print(f"top-K:           {TOP_K}")
    print(f"Index type:      {'ivfflat/hnsw' if any('ivfflat' in str(i) or 'hnsw' in str(i) for i in indexes) else 'sequential scan (no ANN index)'}")

    embed_stats     = stats("Embedding Generation (all-MiniLM-L6-v2)", embed_latencies)
    retrieval_stats = stats("pgvector Retrieval Only", retrieval_latencies)
    e2e_stats       = stats("End-to-End (embed + retrieve)", e2e_latencies)
    print("="*60)

    result = {
        "config": {
            "vector_count": n_vectors,
            "embedding_dim": emb_dim,
            "top_k": TOP_K,
            "n_queries": len(embed_latencies),
            "indexes": [str(i) for i in indexes],
            "explain_analyze": explain_output,
        },
        "embedding": embed_stats,
        "retrieval": retrieval_stats,
        "e2e": e2e_stats,
    }

    out = Path(__file__).parent / "results_d.json"
    out.write_text(json.dumps(result, indent=2, default=str))
    print(f"\nResults saved to {out}")
