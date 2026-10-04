/**
 * Handee Platform - Automated Performance & Load Testing Runner
 * SE3090 Non-Functional Performance Testing Requirement
 */
import fs from 'node:fs';
import path from 'node:path';

const CLOUD_API = 'https://sefproject-g3cmczhth2cygqgh.southeastasia-01.azurewebsites.net';
const CLOUD_AI = 'https://handee-production.up.railway.app';
const LOCAL_API = 'http://localhost:5057';
const LOCAL_AI = 'http://localhost:8000';

// Parse Target CLI flags & Environment
const args = process.argv.slice(2);
let targetMode = (process.env.TARGET || 'auto').toLowerCase();
if (args.includes('--cloud') || args.includes('-cloud') || args.includes('-c')) {
  targetMode = 'cloud';
} else if (args.includes('--local') || args.includes('-local') || args.includes('-l')) {
  targetMode = 'local';
} else {
  const targetIdx = args.findIndex(a => a === '--target' || a === '-target' || a === '-t');
  if (targetIdx !== -1 && args[targetIdx + 1]) {
    targetMode = args[targetIdx + 1].toLowerCase();
  }
}

let BASE_URL = process.env.API_URL;
let AI_URL = process.env.AI_URL;

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
  return sorted[idx];
}

async function isUrlReachable(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return res.status < 500;
  } catch {
    return false;
  }
}

async function benchmarkEndpoint(name, url, options = {}, configOverride = {}) {
  const config = {
    concurrency: 10,
    requestsPerUser: 10,
    timeoutMs: 8000,
    slaP95Ms: 500,
    allowedErrorRate: 1.0,
    ...configOverride,
  };

  const totalRequests = config.concurrency * config.requestsPerUser;
  console.log(`\n[Load Test] Benchmarking: ${name}`);
  console.log(`  Target: ${url}`);
  console.log(`  Load: ${totalRequests} requests (${config.concurrency} concurrent VUs x ${config.requestsPerUser} reps)`);

  const latencies = [];
  let successful = 0;
  let failed = 0;
  const startTime = Date.now();

  async function worker() {
    for (let i = 0; i < config.requestsPerUser; i++) {
      const reqStart = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

        const res = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
        });
        clearTimeout(timeoutId);

        const reqDuration = performance.now() - reqStart;
        latencies.push(reqDuration);

        if (res.status >= 200 && res.status < 400) {
          successful++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
        latencies.push(config.timeoutMs);
      }
    }
  }

  const workers = Array.from({ length: config.concurrency }, () => worker());
  await Promise.all(workers);

  const totalTimeMs = Date.now() - startTime;
  const rps = (totalRequests / (totalTimeMs / 1000)).toFixed(2);

  const avg = (latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1)).toFixed(2);
  const p50 = percentile(latencies, 50).toFixed(2);
  const p90 = percentile(latencies, 90).toFixed(2);
  const p95 = percentile(latencies, 95).toFixed(2);
  const p99 = percentile(latencies, 99).toFixed(2);
  const min = Math.min(...(latencies.length ? latencies : [0])).toFixed(2);
  const max = Math.max(...(latencies.length ? latencies : [0])).toFixed(2);
  const errorRate = ((failed / totalRequests) * 100).toFixed(2);

  const passed = parseFloat(p95) <= config.slaP95Ms && parseFloat(errorRate) <= config.allowedErrorRate;

  const result = {
    endpoint: name,
    url,
    totalRequests,
    successful,
    failed,
    errorRate: `${errorRate}%`,
    durationMs: totalTimeMs,
    requestsPerSecond: parseFloat(rps),
    slaThresholdMs: config.slaP95Ms,
    latencies: {
      min: parseFloat(min),
      avg: parseFloat(avg),
      p50: parseFloat(p50),
      p90: parseFloat(p90),
      p95: parseFloat(p95),
      p99: parseFloat(p99),
      max: parseFloat(max),
    },
    passed,
  };

  console.log(`  ✓ Completed ${totalRequests} requests`);
  console.log(`  - RPS: ${rps} req/sec | Error Rate: ${errorRate}%`);
  console.log(`  - Latency: Avg=${avg}ms | P50=${p50}ms | P95=${p95}ms | P99=${p99}ms`);
  console.log(`  - SLA Threshold (P95 <= ${config.slaP95Ms}ms): ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);

  return result;
}

async function main() {
  console.log('================================================================');
  console.log('  SE3090 Performance & Load Testing Suite — Handee Marketplace  ');
  console.log('================================================================');
  console.log(`  Target Mode Requested: ${targetMode.toUpperCase()}`);

  let isCloudApi = false;
  let isCloudAi = false;

  console.log('\n[Pre-Flight] Resolving Target Endpoints...');

  if (targetMode === 'cloud') {
    BASE_URL = BASE_URL || CLOUD_API;
    AI_URL = AI_URL || CLOUD_AI;
    isCloudApi = true;
    isCloudAi = true;
    console.log(`  ☁️  CLOUD Target: Base API -> ${BASE_URL}`);
    console.log(`  ☁️  CLOUD Target: AI Service -> ${AI_URL}`);
  } else if (targetMode === 'local') {
    BASE_URL = BASE_URL || LOCAL_API;
    AI_URL = AI_URL || LOCAL_AI;
    console.log(`  💻 LOCAL Target: Base API -> ${BASE_URL}`);
    console.log(`  💻 LOCAL Target: AI Service -> ${AI_URL}`);

    const isLocalApiUp = await isUrlReachable(`${BASE_URL}/api/service-listings`);
    const isLocalAiUp = await isUrlReachable(`${AI_URL}/health`);
    if (!isLocalApiUp && !isLocalAiUp) {
      console.error(`\n  ❌ ERROR: Local services are offline. Cannot execute local benchmarks.`);
      console.error(`     To start local services, open a separate terminal and run:`);
      console.error(`       .\\run-services.ps1 -BackendAndAiOnly`);
      console.error(`     Or benchmark the live cloud deployment directly:`);
      console.error(`       node tests/performance/run-load-test.mjs --cloud\n`);
      process.exit(1);
    }
    if (!isLocalApiUp) {
      console.warn(`  ⚠️  WARNING: Local API at ${BASE_URL} is NOT reachable!`);
      console.warn(`     Start services via: .\\run-services.ps1 -BackendAndAiOnly`);
    } else {
      console.log(`  ✅ Local API is online.`);
    }
    if (!isLocalAiUp) {
      console.warn(`  ⚠️  WARNING: Local AI at ${AI_URL} is NOT reachable!`);
    } else {
      console.log(`  ✅ Local AI Agent is online.`);
    }
  } else {
    // Auto Mode: prefer local if up, fallback to cloud
    const localApiUp = await isUrlReachable(`${LOCAL_API}/api/service-listings`);
    const localAiUp = await isUrlReachable(`${LOCAL_AI}/health`);

    if (localApiUp) {
      BASE_URL = BASE_URL || LOCAL_API;
      console.log(`  ✅ Auto-detected running Local API: ${BASE_URL}`);
    } else {
      BASE_URL = BASE_URL || CLOUD_API;
      isCloudApi = true;
      console.log(`  ☁️  Local API offline. Auto-fallback to Cloud API: ${BASE_URL}`);
    }

    if (localAiUp) {
      AI_URL = AI_URL || LOCAL_AI;
      console.log(`  ✅ Auto-detected running Local AI: ${AI_URL}`);
    } else {
      AI_URL = AI_URL || CLOUD_AI;
      isCloudAi = true;
      console.log(`  ☁️  Local AI offline. Auto-fallback to Cloud AI: ${AI_URL}`);
    }
  }

  const results = [];

  // Cloud network WAN RTT typically adds latency, adjust SLA threshold accordingly
  const apiSlaMs = isCloudApi ? 1500 : 350;
  const aiHealthSlaMs = isCloudAi ? 1500 : 350;

  // Scenario 1: Service Listings Read Endpoint
  try {
    const r1 = await benchmarkEndpoint(
      'Service Listings Catalog',
      `${BASE_URL}/api/service-listings`,
      {},
      { concurrency: 10, requestsPerUser: 10, slaP95Ms: apiSlaMs }
    );
    results.push(r1);
  } catch (err) {
    console.error('Failed to run benchmark on service-listings:', err.message);
  }

  // Scenario 2: Provider Search Endpoint
  try {
    const r2 = await benchmarkEndpoint(
      'Provider Search Directory',
      `${BASE_URL}/api/providers/search?searchTerm=Plumbing`,
      {},
      { concurrency: 10, requestsPerUser: 10, slaP95Ms: apiSlaMs }
    );
    results.push(r2);
  } catch (err) {
    console.error('Failed to run benchmark on providers search:', err.message);
  }

  // Scenario 3: AI Assistant Gateway Readiness & High-Throughput Health
  try {
    const r3 = await benchmarkEndpoint(
      'AI Assistant Gateway Readiness',
      `${AI_URL}/health`,
      {},
      { concurrency: 10, requestsPerUser: 10, slaP95Ms: aiHealthSlaMs }
    );
    results.push(r3);
  } catch (err) {
    console.error('Failed to run benchmark on AI gateway:', err.message);
  }

  // Scenario 4: AI Semantic Query Inference (Realistic GenAI Multi-Agent SLA: P95 <= 15000ms)
  try {
    const r4 = await benchmarkEndpoint(
      'AI Assistant Query Inference',
      `${AI_URL}/api/v1/assistant/query`,
      {
        method: 'POST',
        body: JSON.stringify({
          customer_id: 'perf-test-customer',
          query: 'I need a plumber to fix a leaking pipe',
        }),
      },
      { concurrency: 1, requestsPerUser: 2, slaP95Ms: 15000, timeoutMs: 25000 }
    );
    results.push(r4);
  } catch (err) {
    console.error('Failed to run benchmark on AI query inference:', err.message);
  }

  const allPassed = results.every((r) => r.passed);

  console.log('\n================================================================');
  console.log(`  OVERALL LOAD TEST VERDICT: ${allPassed ? 'ALL TESTS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log('================================================================');

  const outDir = import.meta.dirname || path.resolve('tests/performance');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'load-test-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), allPassed, results }, null, 2));
  console.log(`[Results Saved] Full performance report written to: ${outPath}`);
}

main().catch(console.error);
