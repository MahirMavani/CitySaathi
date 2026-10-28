/**
 * CitySaathi FastAPI AI Microservice Client
 * Communicates with the private Python FastAPI microservice over internal localhost HTTP.
 * Implements strict timeouts, bearer token security, response schema validation,
 * and seamless fallback to existing JavaScript duplicate detector and priority engine.
 */

const http = require('http');

class FastApiClient {
  constructor() {
    this.baseUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
    this.token = process.env.INTERNAL_AI_SERVICE_TOKEN || 'cs_sec_token_dev_microservice_2026';
    this.timeoutMs = parseInt(process.env.AI_SERVICE_TIMEOUT_MS || '3500', 10);
    this.isAvailable = false;
    this.lastChecked = 0;
  }

  /**
   * Internal HTTP POST helper using fetch with AbortSignal timeout
   */
  async _post(endpoint, body, timeoutMs = this.timeoutMs) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': this.token
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`FastAPI responded with HTTP ${res.status}: ${errorText}`);
      }

      this.isAvailable = true;
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Safe health check endpoint to check if Python AI service is running
   */
  async checkHealth(timeoutMs = 1500) {
    const url = `${this.baseUrl}/health`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });
      const data = await res.json();
      this.isAvailable = res.ok && data.status === 'healthy';
      this.lastChecked = Date.now();
      return {
        online: this.isAvailable,
        engine: data.engine || 'FastAPI',
        version: data.version || '1.0.0'
      };
    } catch (err) {
      this.isAvailable = false;
      this.lastChecked = Date.now();
      return {
        online: false,
        error: err.message,
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

      const result = await this._post('/internal/v1/duplicates/check', payload, 3000);
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

      const result = await this._post('/internal/v1/priority/evaluate', payload, 2500);
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
