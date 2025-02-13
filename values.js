// Site URLs for load testing
export const SITE_URLS = [
    "https://example1.com/",
    "https://example2.com/"
];

// HTTP Request Duration in milliseconds
export const HTTP_REQ_DURATION = 5000;

// Load test configuration
export const LOAD_TEST_CONFIG = {
    startVUs: 50,      // Starting number of virtual users
    targetVUs: 500,    // Target number of virtual users
    duration: '5m',    // Duration for ramping up (e.g., '5m', '10m', '1h')
    responseTimeout: 5000  // Response timeout in milliseconds
}; 