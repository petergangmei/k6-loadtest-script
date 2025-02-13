import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { SITE_URLS, HTTP_REQ_DURATION, LOAD_TEST_CONFIG } from '../values.js';

// Get configuration from environment variables
const SITE_URL = SITE_URLS[__ENV.K6_SELECTED_INDEX || 0];
const START_VUS = parseInt(__ENV.K6_START_VUS || LOAD_TEST_CONFIG.startVUs);
const TARGET_VUS = parseInt(__ENV.K6_TARGET_VUS || LOAD_TEST_CONFIG.targetVUs);
const RAMP_UP_TIME = __ENV.K6_RAMP_UP_TIME || LOAD_TEST_CONFIG.duration;

// Custom metric to track failed requests
const failureRate = new Rate('failed_requests');

// Sliding window for last 1000 responses
const windowSize = 1000;
const responseWindow = [];
let failedInWindow = 0;
let highestFailedVU = 0;
let firstFailureTime = 0;

// Test configuration
export const options = {
  stages: [
    { duration: RAMP_UP_TIME, target: TARGET_VUS }, // Ramp up to target VUs
  ],
  thresholds: {
    http_req_duration: [{
      threshold: `p(95)<${HTTP_REQ_DURATION}`,
      abortOnFail: true,
      delayAbortEval: '3s'
    }],
    failed_requests: [{
      threshold: 'rate<0.1',
      abortOnFail: true,
      delayAbortEval: '3s'
    }]
  }
};

// Function to update sliding window
function updateSlidingWindow(isFailed) {
  if (responseWindow.length >= windowSize) {
    const oldestResponse = responseWindow.shift();
    if (oldestResponse) failedInWindow--;
  }
  
  responseWindow.push(isFailed);
  if (isFailed) failedInWindow++;
  
  const currentFailRate = failedInWindow / responseWindow.length;
  failureRate.add(isFailed);
  
  if (currentFailRate >= 0.1 && responseWindow.length >= 100) {
    console.warn(`High failure rate detected: ${(currentFailRate * 100).toFixed(2)}% in last ${responseWindow.length} requests at ${__VU} VUs`);
  }
  
  return currentFailRate;
}

// Main test function
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
  
  const isFailed = response.timings.duration >= HTTP_REQ_DURATION || response.status !== 200;
  const currentFailRate = updateSlidingWindow(isFailed);

  if (isFailed) {
    if (highestFailedVU < __VU) highestFailedVU = __VU;
    if (firstFailureTime === 0) firstFailureTime = new Date().getTime();
  }

  sleep(Math.random() * 2 + 1);
}

// Handle test completion
export function handleSummary(data) {
  const duration = (data.state.testRunDuration / 1000).toFixed(2);
  const targetVUs = TARGET_VUS;
  const actualVUs = data.state.peak_vus;
  const percentageReached = ((actualVUs / targetVUs) * 100).toFixed(2);
  const recentFailRate = (failedInWindow / responseWindow.length * 100).toFixed(2);
  
  console.log('\nLoad Test Summary:');
  console.log('================================');
  console.log(`Site Tested: ${SITE_URL}`);
  console.log(`Test Duration: ${duration}s`);
  console.log(`Target VUs: ${targetVUs}`);
  console.log(`Peak VUs Reached: ${actualVUs} (${percentageReached}% of target)`);
  console.log(`First Failure at VU: ${highestFailedVU}`);
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Recent Failure Rate: ${recentFailRate}% (last ${responseWindow.length} requests)`);
  console.log(`Overall Failed Requests: ${data.metrics.failed_requests ? data.metrics.failed_requests.values.count : 0}`);
  console.log(`Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`);
  console.log(`Maximum Response Time: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms`);
  console.log(`Request Rate: ${(data.metrics.http_reqs.values.count / duration).toFixed(2)} req/s`);
  console.log('================================');
}
