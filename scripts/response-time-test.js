import http from 'k6/http';
import { check, sleep } from 'k6';
import { SITE_URLS, HTTP_REQ_DURATION } from '../values.js';

// Get configuration from environment variables
const SITE_URL = SITE_URLS[__ENV.K6_SELECTED_INDEX || 0];

export const options = {
  vus: 1,
  duration: '3s',
  thresholds: {
    http_req_duration: [`p(95)<${HTTP_REQ_DURATION}`],
  },
};

export default function() {
  const params = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
    },
  };

  const response = http.get(SITE_URL, params);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    [`response time < ${HTTP_REQ_DURATION}ms`]: (r) => r.timings.duration < HTTP_REQ_DURATION,
  });

  console.log(`Response time: ${response.timings.duration}ms`);
  sleep(1);
}

export function handleSummary(data) {
  console.log('============================================');
  console.log('======= Response Time Test Summary =========');
  console.log(`Site Tested:`);
  console.log(`${SITE_URL}`);
  console.log(`Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
  console.log(`Minimum Response Time: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms`);
  console.log(`Maximum Response Time: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms`);
  
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log('============================================');
}
