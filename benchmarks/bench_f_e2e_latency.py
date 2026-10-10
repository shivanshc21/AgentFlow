"""
Benchmark F — RAG End-to-End Latency (pipeline decomposition)
==============================================================
Times each stage of the RAG pipeline separately:
  1. Query embedding
  2. pgvector retrieval
  3. Prompt construction
  4. LLM generation (Gemini 2.5 Flash)

NOTE: LLM metrics require GEMINI_API_KEY in .env.
      All other stages are measured regardless.

Run:
    cd e:\AgentFlow\backend
    ..\venv\Scripts\python.exe ..\benchmarks\bench_f_e2e_latency.py
"""
import sys, os, time, statistics, json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
os.chdir(Path(__file__).parent.parent / "backend")

from dotenv import load_dotenv
load_dotenv()

from app.rag.embeddings import generate_embedding
from app.rag.retriever import retrieve_chunks
from app.rag.generator import stream_response
from app.db.database import engine
from sqlalchemy import text

QUERIES = [
    "What is the main topic of this document?",
    "Summarize the key technical details",
    "What are the most important findings?",
    "Describe the methodology used",
    "What skills or experience are highlighted?",
]
N_WARMUP = 2
N_BENCH = 5   # LLM calls are expensive; 5 per query = 25 total

def percentile(data, p):
    if not data:
        return float("nan")
    s = sorted(data)
    k = (len(s) - 1) * p / 100
    f = int(k)
    c = min(f + 1, len(s) - 1)
    return s[f] + (k - f) * (s[c] - s[f])

def stats_block(name, data_ms):
    if not data_ms:
        print(f"  {name}: NO DATA")
        return {}
    d = {
        "n": len(data_ms),
        "min_ms": min(data_ms),
        "mean_ms": statistics.mean(data_ms),
        "p50_ms": percentile(data_ms, 50),
        "p95_ms": percentile(data_ms, 95),
        "p99_ms": percentile(data_ms, 99),
        "max_ms": max(data_ms),
    }
    print(f"\n  [{name}]")
    print(f"    n={d['n']}  min={d['min_ms']:.0f}ms  mean={d['mean_ms']:.0f}ms  "
          f"p50={d['p50_ms']:.0f}ms  p95={d['p95_ms']:.0f}ms  p99={d['p99_ms']:.0f}ms  max={d['max_ms']:.0f}ms")
    return d

if __name__ == "__main__":
    with engine.connect() as conn:
        n = conn.execute(text("SELECT COUNT(*) FROM document_chunks")).scalar()
    print(f"Chunks in DB: {n}")
    if n == 0:
        print("No chunks. Run bench_a first.")
        sys.exit(1)

    gemini_available = bool(os.getenv("GEMINI_API_KEY"))
    print(f"Gemini API:   {'available' if gemini_available else 'NOT AVAILABLE — LLM stages will be skipped'}")

    # Warmup
    print(f"\nWarmup ({N_WARMUP} queries)...")
    for q in QUERIES[:N_WARMUP]:
        generate_embedding(q)
        retrieve_chunks(q)

    embed_ms, retrieval_ms, prompt_ms, llm_ms, ttft_ms, total_ms = [], [], [], [], [], []

    print(f"\nRunning {N_BENCH} × {len(QUERIES)} = {N_BENCH * len(QUERIES)} end-to-end measurements...")
    for iteration in range(N_BENCH):
        for q in QUERIES:
            print(f"  [{iteration+1}/{N_BENCH}] {q[:50]}")
            t_total_start = time.perf_counter()

            # Stage 1: query embedding
            t0 = time.perf_counter()
            _ = generate_embedding(q)
            embed_ms.append((time.perf_counter() - t0) * 1000)

            # Stage 2: retrieval (re-uses generate_embedding internally; we time the whole call)
            t1 = time.perf_counter()
            results = retrieve_chunks(q)
            retrieval_ms.append((time.perf_counter() - t1) * 1000)

            # Stage 3: prompt construction
            t2 = time.perf_counter()
            contexts = [row[0] for row in results]
            context_text = "\n\n".join(contexts)
            prompt = f"\nContext:\n{context_text}\n\nQuestion:\n{q}\n\nAnswer briefly.\n"
            prompt_ms.append((time.perf_counter() - t2) * 1000)

            # Stage 4: LLM
            if gemini_available:
                t3 = time.perf_counter()
                first_token_recorded = False
                full_text = ""
                try:
                    for chunk in stream_response(q, contexts):
                        if not first_token_recorded:
                            ttft_ms.append((time.perf_counter() - t3) * 1000)
                            first_token_recorded = True
                        full_text += chunk
                    llm_ms.append((time.perf_counter() - t3) * 1000)
                except Exception as e:
                    print(f"    LLM error: {e}")
            else:
                print("    LLM stage skipped (no API key)")

            total_ms.append((time.perf_counter() - t_total_start) * 1000)

    print("\n" + "="*60)
    print("BENCHMARK F — RAG END-TO-END LATENCY")
    print("="*60)
    embed_stats    = stats_block("1. Query Embedding (all-MiniLM-L6-v2)", embed_ms)
    ret_stats      = stats_block("2. pgvector Retrieval", retrieval_ms)
    prompt_stats   = stats_block("3. Prompt Construction", prompt_ms)
    if gemini_available:
        ttft_stats = stats_block("4a. Time-to-First-Token (Gemini 2.5 Flash)", ttft_ms)
        llm_stats  = stats_block("4b. Full LLM Generation", llm_ms)
        total_stats= stats_block("5. Total End-to-End", total_ms)
    else:
        ttft_stats = llm_stats = total_stats = {}
        stats_block("4. Total (without LLM)", total_ms)
        print("\n  LLM metrics: UNAVAILABLE (no GEMINI_API_KEY)")
    print("="*60)

    result = {
        "config": {"n_bench": N_BENCH, "n_queries": len(QUERIES), "gemini_available": gemini_available},
        "embedding": embed_stats,
        "retrieval": ret_stats,
        "prompt_construction": prompt_stats,
        "ttft": ttft_stats,
        "llm": llm_stats,
        "total": total_stats,
    }
    out = Path(__file__).parent / "results_f.json"
    out.write_text(json.dumps(result, indent=2, default=str))
    print(f"\nResults saved to {out}")
