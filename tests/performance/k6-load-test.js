import http from 'k6/http';
import { check, group, sleep } from 'k6';

const TARGET = (__ENV.TARGET || 'auto').toLowerCase();
const CLOUD_API = 'https://sefproject-g3cmczhth2cygqgh.southeastasia-01.azurewebsites.net';
const CLOUD_AI = 'https://handee-production.up.railway.app';
const LOCAL_API = 'http://localhost:5057';
const LOCAL_AI = 'http://localhost:8000';

const isCloud = TARGET === 'cloud';
const BASE_URL = __ENV.API_URL || (isCloud ? CLOUD_API : LOCAL_API);
const AI_URL = __ENV.AI_URL || (isCloud ? CLOUD_AI : LOCAL_AI);

// ─── Configuration & Thresholds ─────────────────────────────────────────────
// Defined per SE3090 Non-Functional Performance Testing criteria
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp-up to 10 VUs
    { duration: '1m',  target: 50 },  // Hold at 50 concurrent VUs (peak load)
    { duration: '30s', target: 100 }, // Stress spike to 100 VUs
    { duration: '30s', target: 0 },   // Ramp-down to 0 VUs
  ],
  thresholds: {
    // 95% latency SLA: <1500ms for Cloud WAN, <500ms for Local
    http_req_duration: isCloud ? ['p(95)<1500', 'p(99)<2500'] : ['p(95)<500', 'p(99)<1000'],
    // HTTP error rate must remain strictly below 1%
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  group('01 - Catalog Read Paths (Redis Caching & Latency)', function () {
    // Test 1: Service Listings Search
    const listingsRes = http.get(`${BASE_URL}/api/service-listings`, params);
    check(listingsRes, {
      'listings status is 200': (r) => r.status === 200,
      'listings latency < 350ms': (r) => r.timings.duration < 350,
    });

    // Test 2: Provider Public Directory Search
    const providersRes = http.get(`${BASE_URL}/api/providers/search?searchTerm=Plumbing`, params);
    check(providersRes, {
      'providers status is 200': (r) => r.status === 200,
      'providers latency < 350ms': (r) => r.timings.duration < 350,
    });
  });

  group('02 - AI Agent Workflows & Dispatch Query', function () {
    // Test 3: AI Assistant Conversational Query
    const assistantPayload = JSON.stringify({
      customer_id: 'perf-test-customer',
      query: 'I need an electrician to fix a tripping circuit breaker',
    });

    const assistantRes = http.post(`${AI_URL}/api/v1/assistant/query`, assistantPayload, params);
    check(assistantRes, {
      'assistant status is 200': (r) => r.status === 200,
      'assistant latency < 800ms': (r) => r.timings.duration < 800,
    });
  });

  sleep(1);
}
