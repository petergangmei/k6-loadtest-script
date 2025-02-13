# K6 Load Testing Suite

A configurable load testing suite built with k6 for testing website performance under various conditions. This suite includes both load testing and response time testing capabilities with dynamic configuration options.

## Features

- Interactive CLI interface
- Fully configurable load testing parameters:
  - Starting Virtual Users (VUs)
  - Target Virtual Users
  - Ramp-up duration
  - Response time thresholds
- Two testing modes:
  - Load Test (configurable VUs and duration)
  - Response Time Test (single VU for quick checks)
- Sliding window failure rate detection (last 1000 responses)
- Detailed performance metrics and summaries
- Automatic test abortion on performance degradation

## Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) must be installed on your system
- Bash shell environment

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd k6-loadtest-script
```

2. Make the run script executable:
```bash
chmod +x run.sh
```

## Configuration

Edit `values.js` to configure your test settings:

```javascript
// Site URLs for load testing
export const SITE_URLS = [
    "https://example1.com/",
    "https://example2.com/",
];

// HTTP Request Duration in milliseconds
export const HTTP_REQ_DURATION = 5000;

// Load test configuration (default values)
export const LOAD_TEST_CONFIG = {
    startVUs: 50,      // Starting number of virtual users
    targetVUs: 500,    // Target number of virtual users
    duration: '5m',    // Duration for ramping up
    responseTimeout: 5000  // Response timeout in milliseconds
};
```

## Usage

1. Run the test suite:
```bash
./run.sh
```

2. Select a website to test from the menu
3. Choose a test type:
   - Load Test: Configurable load testing with custom parameters
   - Response Time Test: Quick check of website response times
4. For Load Tests, you'll be prompted to configure:
   - Starting number of Virtual Users (default: 50)
   - Target number of Virtual Users (default: 500)
   - Ramp-up duration (e.g., 30s, 5m, 1h) (default: 5m)

## Test Types

### Load Test
- Configurable starting and target VUs
- Customizable ramp-up duration
- Monitors response times and failure rates
- Uses a sliding window of 1000 responses to detect failure patterns
- Aborts automatically if:
  - 95th percentile response time exceeds threshold
  - Failure rate exceeds 10%

### Response Time Test
- Uses a single virtual user
- Runs for 3 seconds
- Provides basic response time statistics
- Useful for quick health checks

## Output Metrics

### Load Test Summary
- Test duration
- Target vs actual VUs reached
- First failure occurrence
- Total requests
- Recent failure rate (based on last 1000 responses)
- Overall failed requests
- Average and maximum response times
- Request rate

### Response Time Test Summary
- Average response time
- Minimum response time
- Maximum response time
- Total requests

## Error Handling

The suite automatically stops testing when:
- Response times consistently exceed the configured threshold
- Too many requests fail within the sliding window (>10% failure rate)
- The target website becomes unresponsive

## Customization

You can modify default values in `values.js`:
- Add or remove target websites in `SITE_URLS`
- Adjust default VU counts and duration in `LOAD_TEST_CONFIG`
- Modify response time thresholds in `HTTP_REQ_DURATION`

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

[Your chosen license]

