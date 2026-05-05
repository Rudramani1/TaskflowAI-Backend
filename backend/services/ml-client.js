/**
 * ML Service Client — Thin HTTP wrapper for calling the Python ML microservice.
 *
 * Features:
 *   - Timeout: 3 seconds per request
 *   - Retry: 2 attempts with exponential backoff
 *   - Fallback: Returns { fallback: true } on any failure (never throws)
 *
 * Usage:
 *   const mlClient = require('./ml-client');
 *   const result = await mlClient.predict('effort', { title: '...', description: '...' });
 *   if (!result.fallback) { // use ML prediction }
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT_MS = 3000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

// ── Fallback response (returned when ML service is unavailable) ──
const FALLBACK = { prediction: null, confidence: 0, fallback: true };

/**
 * Make an HTTP request to the ML service with retry logic.
 * Uses native fetch (available in Node 18+).
 */
async function makeRequest(method, path, body = null) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      // Build URL with query params for GET requests
      let url = `${ML_SERVICE_URL}${path}`;
      if (body && method === 'GET') {
        const params = new URLSearchParams(body);
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, options);
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[ML Client] HTTP ${response.status} from ${path} (attempt ${attempt})`);
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        return FALLBACK;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const isTimeout = err.name === 'AbortError';
      const label = isTimeout ? 'Timeout' : err.code || err.message;
      console.warn(`[ML Client] ${label} on ${path} (attempt ${attempt}/${MAX_RETRIES})`);

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      return FALLBACK;
    }
  }
  return FALLBACK;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════

/**
 * Call a prediction endpoint on the ML service.
 * @param {string} type - One of: 'effort', 'delay', 'priority', 'assignee'
 * @param {object} data - Request body to send
 * @returns {object} ML response or { fallback: true }
 */
async function predict(type, data) {
  return makeRequest('POST', `/predict/${type}`, data);
}

/**
 * Get user productivity analytics from the ML service.
 * @param {string} orgId
 * @param {string} projectId
 * @param {number} weeks
 */
async function getProductivityAnalytics(orgId, projectId, weeks = 4) {
  return makeRequest('GET', '/analytics/user-productivity', { orgId, projectId, weeks });
}

/**
 * Trigger model training on the ML service.
 * @param {string} orgId
 */
async function trainModels(orgId) {
  return makeRequest('POST', '/train', { orgId });
}

/**
 * Check ML service health.
 */
async function checkHealth() {
  return makeRequest('GET', '/health');
}

module.exports = {
  predict,
  getProductivityAnalytics,
  trainModels,
  checkHealth,
  FALLBACK,
};
