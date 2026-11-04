/**
 * CitySaathi FastAPI AI Microservice Client
 * Communicates with the private Python FastAPI microservice over internal localhost HTTP.
 * Implements strict timeouts, bearer token security, response schema validation,
 * and seamless fallback to existing JavaScript duplicate detector and priority engine.
 */

const http = require('http');

class FastApiClient {
  constructor() {
    this.isAvailable = false;
    this.lastChecked = 0;
  }

  /**
   * Base URL for the AI microservice.
   * Priority:
   * 1. Explicit AI_SERVICE_URL environment variable
   * 2. In serverless cloud (Netlify/Vercel/AWS Lambda): default to production Vercel FastAPI microservice
   * 3. Local development fallback: http://127.0.0.1:8000
   */
  get baseUrl() {
    const raw = process.env.AI_SERVICE_URL;
    if (raw && typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim().replace(/\/+$/, '');
    }
    const isServerless = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);
    if (isServerless) {
      return 'https://citysaathi-ai.vercel.app';
    }
    return 'http://127.0.0.1:8000';
  }

  /**
   * Request timeout in milliseconds (defaults to 5000ms for resilient cross-cloud serverless).
   */
  get timeoutMs() {
    return parseInt(process.env.AI_SERVICE_TIMEOUT_MS || '5000', 10);
  }

  /**
   * Securely retrieve the internal token from Node.js process environment.
   * Returns null if unconfigured (never falls back to hardcoded defaults).
   */
  get token() {
    const raw = process.env.INTERNAL_AI_SERVICE_TOKEN;
    return (raw && typeof raw === 'string' && raw.trim().length > 0) ? raw.trim() : null;
  }

  /**
   * Sanitize a URL for safe logging (strips query parameters and credentials).
   */
  _sanitizeUrl(rawUrl) {
    try {
      const u = new URL(rawUrl);
      return `${u.protocol}//${u.host}${u.pathname}`;
    } catch {
      return rawUrl ? String(rawUrl).split('?')[0] : 'unknown';
    }
  }

  /**
   * Internal HTTP POST helper using fetch with AbortSignal timeout
   */
  async _post(endpoint, body, timeoutMs = this.timeoutMs) {
    const currentToken = this.token;
    if (!currentToken) {
      throw new Error('INTERNAL_AI_SERVICE_TOKEN is not configured in server environment');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': currentToken,
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`FastAPI responded with HTTP ${res.status}: ${errorText.slice(0, 150)}`);
      }

      this.isAvailable = true;
      return await res.json();
    } catch (err) {
      const cause = err.cause ? (err.cause.message || err.cause.code || String(err.cause)) : err.message;
      console.warn(`[CitySaathi] FastAPI POST ${endpoint} failed: ${err.name} - ${cause} (target: ${this._sanitizeUrl(url)})`);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Safe health check endpoint to check if Python AI service is running.
   * Defaults to 4000ms timeout for cross-cloud serverless resilience.
   */
  async checkHealth(timeoutMs = parseInt(process.env.AI_HEALTH_TIMEOUT_MS || '4000', 10)) {
    const url = `${this.baseUrl}/health`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();

    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error(`FastAPI health returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const isHealthy = data.status === 'healthy';
      this.isAvailable = isHealthy;
      this.lastChecked = Date.now();
      return {
        online: isHealthy,
        engine: data.engine || 'FastAPI',
        version: data.version || '1.0.0',
        latencyMs: Date.now() - start,
        target: this._sanitizeUrl(url)
      };
    } catch (err) {
      this.isAvailable = false;
      this.lastChecked = Date.now();
      const cause = err.cause ? (err.cause.message || err.cause.code || String(err.cause)) : (err.name === 'AbortError' ? `Timeout after ${timeoutMs}ms` : err.message);
      return {
        online: false,
        error: err.message,
        cause: cause,
        target: this._sanitizeUrl(url),
        configured: Boolean(process.env.AI_SERVICE_URL),
        hasToken: Boolean(this.token),
        latencyMs: Date.now() - start,
        fallback: 'Local JavaScript AI Services'
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Analyzes complaint using FastAPI microservice for both duplicate ranking and priority.
   * Returns null on failure so the caller transparently falls back to JS engines.
   */
  async analyzeComplaint({
    complaintId = null,
    title,
    description,
    category,
    latitude = null,
    longitude = null,
    ward = null,
    candidates = []
  }) {
    try {
      const payload = {
        complaint_id: complaintId,
        title: title || '',
        description: description || '',
        category: category || 'Road / Pothole',
        latitude: (latitude !== null && latitude !== undefined && !isNaN(latitude)) ? parseFloat(latitude) : null,
        longitude: (longitude !== null && longitude !== undefined && !isNaN(longitude)) ? parseFloat(longitude) : null,
        ward: ward || null,
        candidates: candidates.map(c => ({
          id: c.id,
          complaint_code: c.complaintCode || null,
          title: c.title || '',
          description: c.description || '',
          category: c.category || '',
          status: c.status || 'Submitted',
          priority: c.priority || 'Medium',
          latitude: c.latitude,
          longitude: c.longitude,
          ward: c.ward
        }))
      };

      const result = await this._post('/internal/v1/analyze-complaint', payload);
      if (result && result.success) {
        return {
          source: 'python-fastapi-microservice',
          serviceVersion: result.service_version,
          hasDuplicates: result.has_duplicate_candidates,
          duplicateCandidates: result.duplicate_candidates || [],
          priorityRecommendation: result.priority_recommendation
        };
      }
    } catch (err) {
      console.warn(`[CitySaathi] FastAPI analyzeComplaint call failed (${err.message}). Using local JS fallback.`);
    }
    return null;
  }

  /**
   * Checks duplicate candidates via FastAPI microservice.
   * Formats response to match CitySaathi's existing frontend Duplicate Radar contract.
   */
  async checkDuplicates({
    title,
    description,
    category,
    latitude = null,
    longitude = null,
    ward = null,
    candidates = []
  }) {
    try {
      const payload = {
        title: title || '',
        description: description || '',
        category: category || 'Road / Pothole',
        latitude: (latitude !== null && latitude !== undefined && !isNaN(latitude)) ? parseFloat(latitude) : null,
        longitude: (longitude !== null && longitude !== undefined && !isNaN(longitude)) ? parseFloat(longitude) : null,
        ward: ward || null,
        candidates: candidates.map(c => ({
          id: c.id,
          complaint_code: c.complaintCode || null,
          title: c.title || '',
          description: c.description || '',
          category: c.category || '',
          status: c.status || 'Submitted',
          priority: c.priority || 'Medium',
          latitude: c.latitude,
          longitude: c.longitude,
          ward: c.ward
        }))
      };

      const result = await this._post('/internal/v1/duplicates/check', payload, this.timeoutMs);
      if (result && result.success) {
        // Map Python response fields to CitySaathi duplicate format
        const formattedCandidates = (result.candidates || []).map(m => ({
          complaintId: m.complaint_id,
          complaintCode: m.complaint_code,
          title: m.title,
          category: m.category,
          status: m.status,
          priority: m.priority,
          distanceMeters: m.geographic_distance_meters,
          distanceText: m.geographic_distance_meters !== null ? `${Math.round(m.geographic_distance_meters)}m away` : 'Nearby area',
          textSimilarity: m.text_similarity,
          similarityPercent: `${Math.round(m.composite_score * 100)}%`,
          compositeScore: m.composite_score,
          matchReason: m.match_reason,
          warnings: m.warnings || []
        }));

        return {
          source: 'python-fastapi-microservice',
          success: true,
          hasDuplicates: result.has_duplicates,
          count: result.count,
          highestSimilarity: result.highest_similarity,
          candidates: formattedCandidates
        };
      }
    } catch (err) {
      console.warn(`[CitySaathi] FastAPI checkDuplicates failed (${err.message}). Falling back to JavaScript detector.`);
    }
    return null;
  }

  /**
   * Evaluates complaint priority via FastAPI microservice.
   */
  async evaluatePriority({
    title,
    description,
    category,
    location = '',
    ward = '',
    duplicateCount = 0
  }) {
    try {
      const payload = {
        title: title || '',
        description: description || '',
        category: category || 'Road / Pothole',
        location: location || '',
        ward: ward || '',
        duplicate_count: duplicateCount
      };

      const result = await this._post('/internal/v1/priority/evaluate', payload, this.timeoutMs);
      if (result && result.suggested_priority) {
        return {
          source: 'python-fastapi-microservice',
          priority: result.suggested_priority,
          score: result.priority_score,
          factors: result.signals_used || [],
          explanation: result.explanation,
          missingEvidence: result.missing_evidence || [],
          evaluatedAt: new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn(`[CitySaathi] FastAPI evaluatePriority failed (${err.message}). Falling back to JavaScript engine.`);
    }
    return null;
  }
}

module.exports = new FastApiClient();
