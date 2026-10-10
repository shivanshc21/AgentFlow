/**
 * AgentFlow – k6 Load Test
 * Measures p95 latency for:
 *   GET  /health
 *   GET  /api/documents
 *   GET  /api/query?q=...
 *
 * Run (backend must be up first):
 *   k6 run k6/load_test.js
 *
 * Override base URL:
 *   k6 run -e BASE_URL=http://localhost:8000 k6/load_test.js
 *
 * Export JSON summary:
 *   k6 run --out json=k6/results.json k6/load_test.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// ── Custom per-endpoint metrics ──────────────────────────────────────────────
const healthLatency    = new Trend("latency_health",    true);
const documentsLatency = new Trend("latency_documents", true);
const queryLatency     = new Trend("latency_query",     true);

const errorRate = new Rate("error_rate");
const totalReqs = new Counter("total_requests");

// ── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

const QUERIES = [
  "What is this document about?",
  "Summarize the key points",
  "What are the main conclusions?",
  "List the important details",
  "Give me an overview",
];

// ── Load stages ──────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: "30s", target: 5  },   // ramp up
    { duration: "1m",  target: 10 },   // sustained load
    { duration: "30s", target: 20 },   // stress spike
    { duration: "30s", target: 0  },   // ramp down
  ],

  thresholds: {
    "latency_health":    ["p(95)<500"],     // health must respond < 500ms
    "latency_documents": ["p(95)<1000"],    // doc list < 1s
    "latency_query":     ["p(95)<30000"],   // RAG query < 30s (Gemini + LangGraph)
    "http_req_duration": ["p(95)<30000"],
    "error_rate":        ["rate<0.05"],     // < 5% errors
  },
};

// ── Main test function ────────────────────────────────────────────────────────
export default function () {
  const headers = { "Content-Type": "application/json" };

  // 1. Health check
  group("health", () => {
    const res = http.get(`${BASE_URL}/health`, { headers });
    totalReqs.add(1);
    const failed = res.status !== 200;
    errorRate.add(failed);
    if (!failed) {
      healthLatency.add(res.timings.duration);
    }
    check(res, {
      "health: 200 OK": (r) => r.status === 200,
      "health: has status key": (r) => {
        if (!r.body) return false;
        try { return r.json("status") !== undefined; } catch { return false; }
      },
    });
  });

  sleep(0.5);

  // 2. List documents
  group("documents", () => {
    const res = http.get(`${BASE_URL}/api/documents`, { headers });
    totalReqs.add(1);
    const failed = res.status !== 200;
    errorRate.add(failed);
    if (!failed) {
      documentsLatency.add(res.timings.duration);
    }
    check(res, {
      "documents: 200 OK": (r) => r.status === 200,
      "documents: is array": (r) => {
        if (!r.body) return false;
        try { return Array.isArray(r.json()); } catch { return false; }
      },
    });
  });

  sleep(0.5);

  // 3. RAG query — run on 40% of VUs to avoid rate-limiting Gemini
  if (Math.random() < 0.4) {
    group("query", () => {
      const q = encodeURIComponent(
        QUERIES[Math.floor(Math.random() * QUERIES.length)]
      );
      const res = http.get(`${BASE_URL}/api/query?q=${q}`, {
        headers,
        timeout: "60s",
      });
      totalReqs.add(1);
      const failed = res.status !== 200;
      errorRate.add(failed);
      if (!failed) {
        queryLatency.add(res.timings.duration);
      }
      check(res, {
        "query: 200 OK":     (r) => r.status === 200,
        "query: has answer": (r) => {
          if (!r.body) return false;
          try { return r.json("answer") !== undefined; } catch { return false; }
        },
      });
    });
  }

  sleep(1);
}

// ── Custom summary report ─────────────────────────────────────────────────────
export function handleSummary(data) {
  // k6 stores percentile keys as "p(50)", "p(95)" – access via bracket notation
  function p(metric, pct) {
    const v = data.metrics[metric]?.values;
    if (!v) return "  N/A    ";
    const val = v[`p(${pct})`];
    return val === undefined ? "  N/A    " : (val.toFixed(0) + "ms").padEnd(8);
  }

  function mx(metric) {
    const v = data.metrics[metric]?.values;
    if (!v) return "  N/A    ";
    return (v.max.toFixed(0) + "ms").padEnd(8);
  }

  const er  = data.metrics.error_rate?.values?.rate ?? 0;
  const n   = data.metrics.total_requests?.values?.count ?? 0;
  const dur = data.metrics.http_req_duration?.values;
  const globalP95 = dur ? (dur["p(95)"].toFixed(0) + "ms") : "N/A";

  const report = [
    "",
    "╔══════════════════════════════════════════════════════════╗",
    "║          AgentFlow – k6 Latency Report                   ║",
    "╠══════════════════════════════════════════════════════════╣",
    "║  Endpoint           │   p50      │   p95      │   max    ║",
    "╠══════════════════════════════════════════════════════════╣",
    `║  GET /health        │  ${p("latency_health","50")} │  ${p("latency_health","95")} │  ${mx("latency_health")}  ║`,
    `║  GET /api/documents │  ${p("latency_documents","50")} │  ${p("latency_documents","95")} │  ${mx("latency_documents")}  ║`,
    `║  GET /api/query     │  ${p("latency_query","50")} │  ${p("latency_query","95")} │  ${mx("latency_query")}  ║`,
    "╠══════════════════════════════════════════════════════════╣",
    `║  Global p95         : ${globalP95}`.padEnd(59) + "║",
    `║  Error rate         : ${(er * 100).toFixed(2)}%`.padEnd(59) + "║",
    `║  Total requests     : ${n}`.padEnd(59) + "║",
    "╚══════════════════════════════════════════════════════════╝",
    "",
  ].join("\n");

  console.log(report);
  return {
    "k6/summary.txt": report,
    stdout: report,
  };
}
