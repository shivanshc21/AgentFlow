"""
Benchmark E — RAG Retrieval Quality
=====================================
Creates a small reproducible evaluation set from the documents already in the
DB, then measures Recall@K and MRR against that ground truth.

Ground-truth strategy (automatic, reproducible):
  For each query, we embed it and take the top-1 retrieved chunk as the
  "ground truth relevant" chunk. We then evaluate recall at K=1,3,5,10.
  This is a self-consistency test — it measures whether the system
  consistently retrieves the same top chunks across repeated queries.

IMPORTANT: This does NOT claim semantic correctness of the ground truth.
It measures retrieval consistency/stability. A human labeling step would
be required for semantic correctness. The script also outputs the first
chunk of each ground truth for manual inspection.

Run:
    cd e:\AgentFlow\backend
    ..\venv\Scripts\python.exe ..\benchmarks\bench_e_retrieval_quality.py
"""
import sys, os, json, statistics
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
os.chdir(Path(__file__).parent.parent / "backend")

from dotenv import load_dotenv
load_dotenv()

from app.rag.embeddings import generate_embedding
from app.db.database import engine
from sqlalchemy import text

QUERIES = [
    "What is the main topic of this document?",
    "Describe the key methodology or approach used",
    "What are the conclusions or results?",
    "Who is the author or what is their background?",
    "What technical skills or tools are mentioned?",
    "Describe any projects or implementations discussed",
    "What education or academic background is described?",
    "What programming languages or frameworks are used?",
    "Explain the data or information processing steps",
    "What are the most important findings or outcomes?",
]
TOP_K_MAX = 10

def retrieve_ranked(query, limit=10):
    emb = generate_embedding(query)
    emb_str = "[" + ",".join(map(str, emb)) + "]"
    sql = text("""
        SELECT id, content, embedding <-> CAST(:emb AS vector) AS distance
        FROM document_chunks
        ORDER BY embedding <-> CAST(:emb AS vector)
        LIMIT :k
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"emb": emb_str, "k": limit}).mappings().fetchall()
    return rows

def recall_at_k(ranked_ids, relevant_ids, k):
    top_k = set(ranked_ids[:k])
    return len(top_k & relevant_ids) / len(relevant_ids) if relevant_ids else 0

def mrr(ranked_ids, relevant_ids):
    for rank, doc_id in enumerate(ranked_ids, start=1):
        if doc_id in relevant_ids:
            return 1.0 / rank
    return 0.0

def ndcg_at_k(ranked_ids, relevant_ids, k):
    import math
    def dcg(ids):
        score = 0
        for i, doc_id in enumerate(ids[:k], start=1):
            rel = 1 if doc_id in relevant_ids else 0
            score += rel / math.log2(i + 1)
        return score
    ideal = dcg(list(relevant_ids)[:k])
    actual = dcg(ranked_ids)
    return actual / ideal if ideal > 0 else 0.0

if __name__ == "__main__":
    from sqlalchemy import text
    with engine.connect() as conn:
        n = conn.execute(text("SELECT COUNT(*) FROM document_chunks")).scalar()
    print(f"Chunks in DB: {n}")
    if n == 0:
        print("No chunks in DB. Run bench_a first.")
        sys.exit(1)

    # Phase 1: Build ground truth by running each query once, taking top-1 as relevant
    print("\nPhase 1: Building ground-truth (top-1 chunk per query)...")
    ground_truth = {}  # query -> set of relevant chunk IDs
    gt_preview = {}
    for q in QUERIES:
        rows = retrieve_ranked(q, limit=1)
        if rows:
            gt_id = rows[0]["id"]
            ground_truth[q] = {gt_id}
            gt_preview[q] = rows[0]["content"][:100]
            print(f"  Q: {q[:50]:<50} → chunk_id={gt_id}")
        else:
            ground_truth[q] = set()
            print(f"  Q: {q[:50]:<50} → NO RESULT")

    # Phase 2: Evaluate — run each query 5 times, average metrics
    print("\nPhase 2: Evaluating recall (5 runs per query)...")
    N_EVAL_RUNS = 5
    all_r1, all_r3, all_r5, all_r10, all_mrr, all_ndcg5 = [], [], [], [], [], []

    for run in range(N_EVAL_RUNS):
        for q in QUERIES:
            relevant = ground_truth[q]
            if not relevant:
                continue
            rows = retrieve_ranked(q, limit=TOP_K_MAX)
            ranked_ids = [r["id"] for r in rows]

            all_r1.append(recall_at_k(ranked_ids, relevant, 1))
            all_r3.append(recall_at_k(ranked_ids, relevant, 3))
            all_r5.append(recall_at_k(ranked_ids, relevant, 5))
            all_r10.append(recall_at_k(ranked_ids, relevant, 10))
            all_mrr.append(mrr(ranked_ids, relevant))
            all_ndcg5.append(ndcg_at_k(ranked_ids, relevant, 5))

    def mean(lst): return statistics.mean(lst) if lst else float("nan")

    print("\n" + "="*60)
    print("BENCHMARK E — RAG RETRIEVAL QUALITY")
    print("="*60)
    print(f"Queries:       {len(QUERIES)}")
    print(f"Eval runs:     {N_EVAL_RUNS}")
    print(f"Total evals:   {len(all_r1)}")
    print(f"")
    print(f"IMPORTANT: Ground truth = top-1 chunk from first retrieval.")
    print(f"This measures RETRIEVAL CONSISTENCY, not semantic correctness.")
    print(f"For semantic correctness, manual labeling is required.")
    print(f"")
    print(f"Recall@1  = {mean(all_r1):.3f}")
    print(f"Recall@3  = {mean(all_r3):.3f}")
    print(f"Recall@5  = {mean(all_r5):.3f}")
    print(f"Recall@10 = {mean(all_r10):.3f}")
    print(f"MRR       = {mean(all_mrr):.3f}")
    print(f"nDCG@5    = {mean(all_ndcg5):.3f}")
    print("="*60)
    print("\nGround truth preview (chunk_id → first 100 chars):")
    for q, preview in gt_preview.items():
        print(f"  [{q[:40]}] → \"{preview}\"")

    result = {
        "queries": len(QUERIES),
        "eval_runs": N_EVAL_RUNS,
        "ground_truth_method": "top-1 from first retrieval (consistency test, NOT semantic)",
        "recall_at_1": mean(all_r1),
        "recall_at_3": mean(all_r3),
        "recall_at_5": mean(all_r5),
        "recall_at_10": mean(all_r10),
        "mrr": mean(all_mrr),
        "ndcg_at_5": mean(all_ndcg5),
        "ground_truth_preview": gt_preview,
    }
    out = Path(__file__).parent / "results_e.json"
    out.write_text(json.dumps(result, indent=2, default=str))
    print(f"\nResults saved to {out}")
