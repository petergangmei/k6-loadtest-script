// Site URLs for load testing
export const SITE_URLS = [
    "https://example1.com/",
    "https://example2.com/"
];

// Load test configuration
export const LOAD_TEST_CONFIG = {
    startVUs: 50,         // Starting number of virtual users
    targetVUs: 500,       // Target number of virtual users
    duration: '5m',       // Duration for ramping up (e.g., '5m', '10m', '1h')
    threshold:1500,      // Response time threshold in milliseconds
    maxFailures: 10       // Maximum number of failed requests before aborting
}; 
