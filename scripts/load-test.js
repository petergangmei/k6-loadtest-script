import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { SITE_URLS, LOAD_TEST_CONFIG } from '../values.js';

// Get configuration from environment variables
const SITE_URL = SITE_URLS[__ENV.K6_SELECTED_INDEX || 0];
const START_VUS = parseInt(__ENV.K6_START_VUS || LOAD_TEST_CONFIG.startVUs);
const TARGET_VUS = parseInt(__ENV.K6_TARGET_VUS || LOAD_TEST_CONFIG.targetVUs);
const RAMP_UP_TIME = __ENV.K6_RAMP_UP_TIME || LOAD_TEST_CONFIG.duration;
const THRESHOLD = LOAD_TEST_CONFIG.threshold;
const MAX_FAILURES = LOAD_TEST_CONFIG.maxFailures;  // New: Maximum allowed failures

// Custom metric to track failed requests
const failedRequests = new Counter('failed_requests');

// Sliding window for tracking recent failures
const windowSize = 100;  // Reduced window size for more immediate response
const responseWindow = [];
let failedInWindow = 0;
let totalFailures = 0;  // New: Track total failures
let highestFailedVU = 0;
let firstFailureTime = 0;

// Test configuration with proper ramping
export const options = {
  stages: [
    { duration: '20s', target: START_VUS },    // Ramp up to initial VUs
    { duration: '10s', target: START_VUS },    // Stay at initial VUs
    { duration: RAMP_UP_TIME, target: TARGET_VUS }, // Ramp up to target VUs
    { duration: '30s', target: TARGET_VUS },   // Stay at target VUs
    { duration: '30s', target: 0 },            // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: [{
      threshold: `p(95)<${THRESHOLD}`,
      abortOnFail: true,
      delayAbortEval: '3s'
    }],
    failed_requests: [{
      threshold: `count<${MAX_FAILURES}`,  // Changed from value to count
      abortOnFail: true,
      delayAbortEval: '1s'
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
  if (isFailed) {
    failedInWindow++;
    totalFailures++;  // Increment total failures
    failedRequests.add(1);  // Increment the counter
    
    if (totalFailures >= MAX_FAILURES) {
      console.warn(`Failure threshold reached: ${totalFailures} failures (maximum: ${MAX_FAILURES})`);
    }
  }
  
  return failedInWindow;
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
  
  const isFailed = response.timings.duration >= THRESHOLD || response.status !== 200;
  const currentFailRate = updateSlidingWindow(isFailed);

  if (isFailed) {
    if (highestFailedVU < __VU) highestFailedVU = __VU;
    if (firstFailureTime === 0) firstFailureTime = new Date().getTime();
  }

  sleep(Math.random() * 2 + 1);
}

// Handle test completion
export function handleSummary(data) {
  // Ensure we have valid data
  const duration = data.state.testRunDuration ? (data.state.testRunDuration / 1000).toFixed(2) : 0;
  const targetVUs = TARGET_VUS;
  
  // Get VU metrics correctly from state
  const peakVUs = data.state.peak_vus || 0;  // Maximum VUs reached during test
  const currentVUs = data.state.vus || 0;    // VUs at test end
  const percentageReached = ((peakVUs / targetVUs) * 100).toFixed(2);
  
  // Calculate failure rates
  const totalRequests = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const failedRequests = data.metrics.http_req_failed ? 
    Math.round(data.metrics.http_req_failed.values.rate * totalRequests) : 0;
  const overallFailRate = totalRequests > 0 ? 
    (data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : "0.00") : "0.00";
  const recentFailRate = responseWindow.length > 0 ? 
    ((failedInWindow / responseWindow.length) * 100).toFixed(2) : "0.00";
  
  // Calculate the last successful VU count
  const lastSuccessfulVUs = highestFailedVU > 0 ? highestFailedVU - 1 : peakVUs;
  const successPercentage = ((lastSuccessfulVUs / targetVUs) * 100).toFixed(2);
  
  // Get response times
  const avgResponseTime = data.metrics.http_req_duration ? 
    data.metrics.http_req_duration.values.avg.toFixed(2) : 0;
  const maxResponseTime = data.metrics.http_req_duration ? 
    data.metrics.http_req_duration.values.max.toFixed(2) : 0;
  const requestRate = duration > 0 ? (totalRequests / duration).toFixed(2) : 0;

  console.log('\nLoad Test Summary:');
  console.log('================================');
  console.log(`Site Tested: ${SITE_URL}`);
  console.log(`Test Duration: ${duration}s`);
  console.log(`Target VUs: ${targetVUs}`);
  console.log(`Peak VUs Reached: ${peakVUs} (${percentageReached}% of target)`);
  console.log(`Current VUs at End: ${currentVUs}`);
  console.log(`Last Successful VUs: ${lastSuccessfulVUs} (${successPercentage}% of target)`);
  console.log(`First Failure at VU: ${highestFailedVU || 'No failures'}`);
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Total Failed Requests: ${totalFailures}`);  // Changed: Show absolute count
  console.log(`Recent Failures: ${failedInWindow} (in last ${responseWindow.length} requests)`);
  console.log(`Average Response Time: ${avgResponseTime}ms`);
  console.log(`Maximum Response Time: ${maxResponseTime}ms`);
  console.log(`Request Rate: ${requestRate} req/s`);
  
  // Add failure reason if test was aborted
  if (duration < parseInt(RAMP_UP_TIME)) {
    console.log('\nTest Aborted Early:');
    if (maxResponseTime > THRESHOLD) {
      console.log(`- Response time exceeded threshold (${THRESHOLD}ms)`);
    }
    if (totalFailures >= MAX_FAILURES) {
      console.log(`- Number of failures exceeded threshold (${totalFailures}/${MAX_FAILURES})`);
    }
  }
  
  console.log('================================');
}
