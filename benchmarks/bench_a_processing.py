"""
Benchmark A — Document Processing Throughput
=============================================
Runs the REAL AgentFlow pipeline (parse -> chunk -> embed -> index) on the
benchmark PDF dataset, timing each stage individually.

Run from repo root:
    cd e:\AgentFlow\backend
    ..\venv\Scripts\python.exe ..\benchmarks\bench_a_processing.py
"""
import sys, os, time, statistics, json
from pathlib import Path

# Make the backend importable
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
os.chdir(Path(__file__).parent.parent / "backend")

from dotenv import load_dotenv
load_dotenv()

from app.services.pdf_parser import extract_text_from_pdf
from app.rag.chunker import chunk_text
from app.rag.embeddings import generate_embedding
from app.rag.vector_store import store_chunks
from pypdf import PdfReader

PDF_DIR = Path(__file__).parent / "pdfs"

def count_pages(path):
    reader = PdfReader(str(path))
    return len(reader.pages)

def run_benchmark(pdfs, runs=3):
    all_runs = []
    for run_idx in range(runs):
        print(f"\n=== Run {run_idx+1}/{runs} ===")
        results = []
        for pdf in pdfs:
            print(f"  Processing: {pdf.name}")
            pages = count_pages(pdf)

            # Stage 1: parse
            t0 = time.perf_counter()
            text = extract_text_from_pdf(str(pdf))
            t_parse = time.perf_counter() - t0

            # Stage 2: chunk
            t1 = time.perf_counter()
            chunks = chunk_text(text)
            t_chunk = time.perf_counter() - t1

            # Stage 3: embed (time total and per-chunk)
            t2 = time.perf_counter()
            processed = []
            for chunk in chunks:
                emb = generate_embedding(chunk)
                processed.append({"content": chunk, "embedding": emb})
            t_embed = time.perf_counter() - t2

            # Stage 4: store (vector insert)
            t3 = time.perf_counter()
            store_chunks(processed)
            t_store = time.perf_counter() - t3

            total = t_parse + t_chunk + t_embed + t_store

            results.append({
                "file": pdf.name,
                "pages": pages,
                "chunks": len(chunks),
                "t_parse_s": t_parse,
                "t_chunk_s": t_chunk,
                "t_embed_s": t_embed,
                "t_store_s": t_store,
                "total_s": total,
            })
            print(f"    pages={pages} chunks={len(chunks)} "
                  f"parse={t_parse:.2f}s chunk={t_chunk:.3f}s "
                  f"embed={t_embed:.2f}s store={t_store:.2f}s "
                  f"TOTAL={total:.2f}s")

        all_runs.append(results)

    return all_runs

def summarize(all_runs):
    # Aggregate across all runs
    totals = {"pages": 0, "chunks": 0, "docs": 0, "total_s": []}
    per_doc_times = []
    embed_times = []

    for run in all_runs:
        run_total_s = 0
        for r in run:
            totals["pages"] += r["pages"]
            totals["chunks"] += r["chunks"]
            totals["docs"] += 1
            run_total_s += r["total_s"]
            per_doc_times.append(r["total_s"])
            embed_times.append(r["t_embed_s"])
        totals["total_s"].append(run_total_s)

    n_runs = len(all_runs)
    n_docs = len(all_runs[0])
    pages_per_run = totals["pages"] // n_runs
    chunks_per_run = totals["chunks"] // n_runs
    mean_total = statistics.mean(totals["total_s"])
    std_total  = statistics.stdev(totals["total_s"]) if n_runs > 1 else 0

    print("\n" + "="*60)
    print("BENCHMARK A — DOCUMENT PROCESSING THROUGHPUT")
    print("="*60)
    print(f"Runs:                    {n_runs}")
    print(f"Documents per run:       {n_docs}")
    print(f"Total pages per run:     {pages_per_run}")
    print(f"Total chunks per run:    {chunks_per_run}")
    print(f"")
    print(f"Run times (s):           {[f'{t:.2f}' for t in totals['total_s']]}")
    print(f"Mean total time:         {mean_total:.2f}s  (std={std_total:.2f}s)")
    print(f"")
    pages_per_min = (pages_per_run / mean_total) * 60
    docs_per_min  = (n_docs / mean_total) * 60
    chunks_per_sec = chunks_per_run / mean_total
    print(f"Pages/min:               {pages_per_min:.1f}")
    print(f"Documents/min:           {docs_per_min:.2f}")
    print(f"Chunks/sec:              {chunks_per_sec:.2f}")
    print(f"Avg doc processing time: {statistics.mean(per_doc_times):.2f}s")
    print(f"Median embed time/doc:   {statistics.median(embed_times):.2f}s")
    print("="*60)

    return {
        "runs": n_runs,
        "docs_per_run": n_docs,
        "pages_per_run": pages_per_run,
        "chunks_per_run": chunks_per_run,
        "run_times_s": totals["total_s"],
        "mean_total_s": mean_total,
        "std_total_s": std_total,
        "pages_per_min": pages_per_min,
        "docs_per_min": docs_per_min,
        "chunks_per_sec": chunks_per_sec,
        "avg_doc_time_s": statistics.mean(per_doc_times),
    }

if __name__ == "__main__":
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if not pdfs:
        print("No PDFs found in benchmarks/pdfs/")
        sys.exit(1)
    print(f"Dataset: {len(pdfs)} PDFs")
    for p in pdfs:
        print(f"  {p.name}  ({p.stat().st_size/1024:.0f} KB)")

    all_runs = run_benchmark(pdfs, runs=3)
    summary = summarize(all_runs)

    out = Path(__file__).parent / "results_a.json"
    out.write_text(json.dumps({"summary": summary, "raw_runs": all_runs}, indent=2))
    print(f"\nResults saved to {out}")
