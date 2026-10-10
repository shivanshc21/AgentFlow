"""
Benchmark B — Async Upload API Latency
=======================================
Measures HTTP response time for POST /api/upload (async, returns immediately
while processing happens in Celery background).

Also measures GET /api/documents and GET /health for comparison.

Run from repo root:
    cd e:\AgentFlow\backend
    ..\venv\Scripts\python.exe ..\benchmarks\bench_b_api_latency.py

Requires: FastAPI server running on localhost:8000
"""
import sys, time, statistics, json
from pathlib import Path

try:
    import httpx
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "httpx", "-q"])
    import httpx

BASE_URL = "http://localhost:8000"
PDF_PATH = Path(__file__).parent / "pdfs" / "Resume__ (1).pdf"  # smallest PDF
N_WARMUP = 3
N_REQUESTS = 30

def measure_endpoint(client, method, url, **kwargs):
    t0 = time.perf_counter()
    resp = client.request(method, url, **kwargs)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    return elapsed_ms, resp.status_code

def percentile(data, p):
    sorted_d = sorted(data)
    k = (len(sorted_d) - 1) * p / 100
    f = int(k)
    c = f + 1
    if c >= len(sorted_d):
        return sorted_d[f]
    return sorted_d[f] + (k - f) * (sorted_d[c] - sorted_d[f])

def report(name, latencies, errors):
    if not latencies:
        print(f"{name}: NO SUCCESSFUL REQUESTS")
        return {}
    print(f"\n--- {name} ---")
    print(f"  n={len(latencies)}  errors={errors}")
    print(f"  min   = {min(latencies):.1f}ms")
    print(f"  mean  = {statistics.mean(latencies):.1f}ms")
    print(f"  p50   = {percentile(latencies, 50):.1f}ms")
    print(f"  p90   = {percentile(latencies, 90):.1f}ms")
    print(f"  p95   = {percentile(latencies, 95):.1f}ms")
    print(f"  p99   = {percentile(latencies, 99):.1f}ms")
    print(f"  max   = {max(latencies):.1f}ms")
    print(f"  error_rate = {errors/(len(latencies)+errors)*100:.1f}%")
    return {
        "n": len(latencies), "errors": errors,
        "min_ms": min(latencies), "mean_ms": statistics.mean(latencies),
        "p50_ms": percentile(latencies, 50), "p90_ms": percentile(latencies, 90),
        "p95_ms": percentile(latencies, 95), "p99_ms": percentile(latencies, 99),
        "max_ms": max(latencies),
        "error_rate_pct": errors/(len(latencies)+errors)*100,
    }

if __name__ == "__main__":
    if not PDF_PATH.exists():
        print(f"PDF not found: {PDF_PATH}")
        sys.exit(1)

    results = {}
    with httpx.Client(timeout=30.0) as client:

        # ── Warmup ──────────────────────────────────────────────────────────
        print(f"Warming up ({N_WARMUP} requests)...")
        for _ in range(N_WARMUP):
            try:
                client.get(f"{BASE_URL}/health")
            except Exception:
                pass

        # ── Benchmark 1: GET /health ─────────────────────────────────────
        print(f"\nBenchmarking GET /health  (n={N_REQUESTS})...")
        lats, errs = [], 0
        for _ in range(N_REQUESTS):
            try:
                ms, status = measure_endpoint(client, "GET", f"{BASE_URL}/health")
                if status == 200:
                    lats.append(ms)
                else:
                    errs += 1
            except Exception:
                errs += 1
        results["health"] = report("GET /health", lats, errs)

        # ── Benchmark 2: GET /api/documents ──────────────────────────────
        print(f"\nBenchmarking GET /api/documents  (n={N_REQUESTS})...")
        lats, errs = [], 0
        for _ in range(N_REQUESTS):
            try:
                ms, status = measure_endpoint(client, "GET", f"{BASE_URL}/api/documents")
                if status == 200:
                    lats.append(ms)
                else:
                    errs += 1
            except Exception:
                errs += 1
        results["documents"] = report("GET /api/documents", lats, errs)

        # ── Benchmark 3: POST /api/upload (async — measures HTTP response only) ──
        print(f"\nBenchmarking POST /api/upload (async, n={N_REQUESTS})...")
        print("NOTE: This measures HTTP response time ONLY.")
        print("Background processing (Celery) is decoupled and NOT included.")
        lats, errs = [], 0
        for _ in range(N_REQUESTS):
            try:
                with open(PDF_PATH, "rb") as f:
                    t0 = time.perf_counter()
                    resp = client.post(
                        f"{BASE_URL}/api/upload",
                        files={"file": (PDF_PATH.name, f, "application/pdf")}
                    )
                    ms = (time.perf_counter() - t0) * 1000
                if resp.status_code == 200:
                    lats.append(ms)
                else:
                    errs += 1
                    print(f"  Non-200: {resp.status_code} {resp.text[:80]}")
            except Exception as e:
                errs += 1
                print(f"  Error: {e}")
        results["upload_async"] = report("POST /api/upload (async HTTP response)", lats, errs)

    print("\n" + "="*60)
    print("BENCHMARK B SUMMARY")
    print("="*60)
    print("Key insight: POST /api/upload returns immediately because")
    print("document processing is offloaded to Celery/Redis workers.")
    print("="*60)

    out = Path(__file__).parent / "results_b.json"
    out.write_text(json.dumps(results, indent=2))
    print(f"\nResults saved to {out}")
