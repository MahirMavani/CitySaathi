/**
 * CitySaathi Gemini Generative AI Service
 * Utilizes the official @google/genai SDK for intelligent civic triage,
 * description rewriting, missing detail extraction, and structured classification.
 *
 * Includes automatic graceful fallback to local supervised TF-IDF + rule engine
 * if GEMINI_API_KEY is unset, rate-limited, invalid, or network fails.
 */

const { GoogleGenAI } = require('@google/genai');
const aiClassifier = require('./aiClassifier');
const priorityEngine = require('./priorityEngine');

// Supported Municipal Categories in CitySaathi
const VALID_CATEGORIES = [
  'Road / Pothole',
  'Garbage / Waste',
  'Streetlight',
  'Water / Drainage',
  'Public Amenities'
];

// Department Routing Mappings
const DEPARTMENT_MAP = {
  'Road / Pothole': {
    code: 'BBMP_ROAD',
    name: 'BBMP Road Infrastructure & Major Arteries'
  },
  'Garbage / Waste': {
    code: 'BBMP_SWM',
    name: 'BBMP Solid Waste Management (SWM)'
  },
  'Streetlight': {
    code: 'BESCOM_POWER',
    name: 'BESCOM Electrical & Power Supply'
  },
  'Water / Drainage': {
    code: 'BWSSB_WATER',
    name: 'BWSSB Water Supply & Sewerage Board'
  },
  'Public Amenities': {
    code: 'BTP_AMENITY',
    name: 'BTP & BBMP Parks & Public Amenities'
  }
};

const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

/**
 * Normalizes any free-form category returned by LLM into CitySaathi's 5 exact categories
 */
function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'string') return 'Road / Pothole';
  const trimmed = raw.trim();
  if (VALID_CATEGORIES.includes(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();
  if (lower.includes('road') || lower.includes('pothole') || lower.includes('asphalt') || lower.includes('crater') || lower.includes('footpath') || lower.includes('manhole')) {
    return 'Road / Pothole';
  }
  if (lower.includes('garbage') || lower.includes('waste') || lower.includes('trash') || lower.includes('dump') || lower.includes('debris') || lower.includes('litter')) {
    return 'Garbage / Waste';
  }
  if (lower.includes('light') || lower.includes('lamp') || lower.includes('electric') || lower.includes('wire') || lower.includes('pole') || lower.includes('power')) {
    return 'Streetlight';
  }
  if (lower.includes('water') || lower.includes('drain') || lower.includes('sewer') || lower.includes('flood') || lower.includes('leak') || lower.includes('pipe') || lower.includes('tank')) {
    return 'Water / Drainage';
  }
  if (lower.includes('park') || lower.includes('amenit') || lower.includes('toilet') || lower.includes('tree') || lower.includes('branch') || lower.includes('bench') || lower.includes('sign')) {
    return 'Public Amenities';
  }
  return 'Road / Pothole';
}

/**
 * Normalizes priority into one of the 4 standard municipal priority tiers
 */
function normalizePriority(raw) {
  if (!raw || typeof raw !== 'string') return 'Medium';
  const trimmed = raw.trim();
  if (VALID_PRIORITIES.includes(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();
  if (lower.includes('crit') || lower.includes('danger') || lower.includes('severe') || lower.includes('hazard')) return 'Critical';
  if (lower.includes('high') || lower.includes('urg') || lower.includes('major')) return 'High';
  if (lower.includes('low') || lower.includes('minor') || lower.includes('routine')) return 'Low';
  return 'Medium';
}

class GeminiService {
  constructor() {
    this.apiKey = '';
    this.client = null;
    this.primaryModel = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    this.fallbackModel = 'gemini-flash-latest';
  }

  /**
   * Lazily resolves and initializes the GoogleGenAI client
   * ensuring hot-reloaded process.env values are recognized immediately.
   */
  getClient() {
    const rawKey = (process.env.GEMINI_API_KEY || '').trim();

    // Check for empty or dummy placeholder strings
    if (!rawKey || rawKey === '""' || rawKey === "''" || rawKey.startsWith('YOUR_') || rawKey.length < 10) {
      this.client = null;
      this.apiKey = '';
      return null;
    }

    if (this.client && this.apiKey === rawKey) {
      return this.client;
    }

    this.apiKey = rawKey;
    try {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
      return this.client;
    } catch (err) {
      console.warn('[CitySaathi AI] Failed to initialize GoogleGenAI client:', err.message);
      this.client = null;
      return null;
    }
  }

  isConfigured() {
    return Boolean(this.getClient());
  }

  /**
   * Safe status inspection that NEVER prints or exposes the actual key
   */
  getKeyStatus() {
    const rawKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!rawKey || rawKey.startsWith('YOUR_') || rawKey.length < 10) {
      return {
        configured: false,
        status: 'Unconfigured (Fallback Local Engine Active)',
        primaryModel: this.primaryModel,
        fallbackModel: this.fallbackModel
      };
    }

    const masked = `${rawKey.substring(0, 4)}...${rawKey.substring(rawKey.length - 3)}`;
    return {
      configured: true,
      status: 'Configured in .env',
      keyMasked: masked,
      keyLength: rawKey.length,
      primaryModel: this.primaryModel,
      fallbackModel: this.fallbackModel
    };
  }

  /**
   * Safe timeout wrapper for Gemini SDK calls to avoid long blocking on network delays
   */
  async generateWithTimeout(client, model, contents, config, timeoutMs = 7000) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Gemini ${model} request timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    try {
      return await Promise.race([
        client.models.generateContent({ model, contents, config }),
        timeoutPromise
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Safe smoke test to verify whether the configured key successfully connects to the Gemini API
   */
  async testConnection() {
    const client = this.getClient();
    if (!client) {
      return {
        ok: false,
        status: 'unconfigured',
        error: 'GEMINI_API_KEY is not configured in .env'
      };
    }

    // Try primary model first
    try {
      const response = await this.generateWithTimeout(
        client,
        this.primaryModel,
        'Respond with only the single word: READY',
        { maxOutputTokens: 10, temperature: 0.1 },
        6000
      );
      const text = (response.text || '').trim();
      return {
        ok: true,
        status: 'connected',
        model: this.primaryModel,
        response: text
      };
    } catch (primaryErr) {
      // If primary model failed, test fallback model
      try {
        const fallbackRes = await this.generateWithTimeout(
          client,
          this.fallbackModel,
          'Respond with only the single word: READY',
          { maxOutputTokens: 10, temperature: 0.1 },
          6000
        );
        const text = (fallbackRes.text || '').trim();
        return {
          ok: true,
          status: 'connected_via_fallback_model',
          model: this.fallbackModel,
          response: text
        };
      } catch (fallbackErr) {
        return {
          ok: false,
          status: 'error',
          error: fallbackErr.message || primaryErr.message
        };
      }
    }
  }

  /**
   * Main AI Assistance Endpoint:
   * Categorizes, prioritizes, summarizes, clarifies, and identifies missing info.
   */
  async assistComplaint({ title = '', description = '', category = '', ward = '', location = '' }) {
    const combinedText = `${title} ${description}`.trim();
    const client = this.getClient();

    // 1. If Gemini API key is configured, invoke Gemini with structured JSON output
    if (client && combinedText.length > 5) {
      try {
        const prompt = `You are CitySaathi AI, a civic-tech intelligence assistant for Bengaluru municipal administration (BBMP, BESCOM, BWSSB, Solid Waste Management).
Analyze this citizen complaint and return ONLY a valid JSON object matching the requested schema. Do not invent facts, addresses, or government decisions.

Citizen Input:
- Title: "${title}"
- Description: "${description}"
- User selected category: "${category || 'Unspecified'}"
- Ward / Location: "${ward || location || 'Bengaluru'}"

Valid Categories:
- "Road / Pothole" (BBMP Road Infrastructure: craters, asphalt, footpaths, manholes)
- "Garbage / Waste" (Solid Waste Management: overflowing bins, illegal blackspots, debris)
- "Streetlight" (BESCOM Power: dark roads, dead luminaires, sparking, hanging wires)
- "Water / Drainage" (BWSSB: potable pipe leaks, sewage overflow, storm drain blockage)
- "Public Amenities" (Parks, public toilets, bus shelters, fallen branches, traffic signs)

Valid Priorities:
- "Critical" (Immediate safety/life risk: exposed wires, open manholes, major cave-ins, active floods)
- "High" (Major disturbance: uncollected waste, dark street, deep crater on arterial road)
- "Medium" (Standard routine defect)
- "Low" (Minor aesthetic / routine amenity request)

Return JSON with exactly these keys:
{
  "suggestedCategory": "<one of valid categories>",
  "categoryReasoning": "<1 sentence why this category was matched>",
  "suggestedPriority": "<Critical | High | Medium | Low>",
  "priorityReasoning": "<1 sentence explaining safety hazard or transit impact>",
  "neutralSummary": "<1 concise objective sentence summarizing the exact problem>",
  "clarifiedDescription": "<A well-written, polished version of the citizen description preserving all original meaning without adding false facts>",
  "missingDetails": ["<useful missing detail 1, e.g. landmark, approx diameter/depth, how many days active>"],
  "civicSafetyAdvice": "<1 helpful citizen safety tip, e.g. 'Use caution after dusk' or 'Avoid stepping in water near electrical pole'>",
  "confidenceScore": <number between 0.70 and 0.98>,
  "aiEngine": "Google Gemini"
}`;

        let response;
        let usedModel = this.primaryModel;
        try {
          response = await this.generateWithTimeout(
            client,
            this.primaryModel,
            prompt,
            { responseMimeType: 'application/json', temperature: 0.2 },
            7000
          );
        } catch (primaryErr) {
          console.warn(`[CitySaathi AI] ${this.primaryModel} failed (${primaryErr.message}), trying ${this.fallbackModel}...`);
          usedModel = this.fallbackModel;
          response = await this.generateWithTimeout(
            client,
            this.fallbackModel,
            prompt,
            { responseMimeType: 'application/json', temperature: 0.2 },
            6000
          );
        }

        const rawText = response.text || (response.candidates && response.candidates[0]?.content?.parts[0]?.text);
        if (rawText) {
          const parsed = JSON.parse(rawText.trim());
          const normalizedCat = normalizeCategory(parsed.suggestedCategory || category);
          const normalizedPrio = normalizePriority(parsed.suggestedPriority);
          const dept = DEPARTMENT_MAP[normalizedCat] || DEPARTMENT_MAP['Road / Pothole'];

          return {
            success: true,
            source: 'gemini',
            model: usedModel,
            data: {
              category: normalizedCat,
              categoryReasoning: parsed.categoryReasoning || 'AI matched complaint patterns.',
              priority: normalizedPrio,
              priorityReasoning: parsed.priorityReasoning || 'Assessed based on municipal safety guidelines.',
              neutralSummary: parsed.neutralSummary || title,
              clarifiedDescription: parsed.clarifiedDescription || description,
              missingDetails: Array.isArray(parsed.missingDetails) ? parsed.missingDetails : [],
              civicSafetyAdvice: parsed.civicSafetyAdvice || '',
              safetyConcern: parsed.civicSafetyAdvice || '',
              suggestedDepartment: dept,
              confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.92,
              confidencePercent: `${Math.round((parsed.confidenceScore || 0.92) * 100)}%`,
              isLowConfidence: false,
              aiEngine: `Google Gemini (${usedModel})`
            }
          };
        }
      } catch (geminiErr) {
        console.warn('[CitySaathi AI] Gemini processing encountered error; gracefully falling back to local TF-IDF model:', geminiErr.message);
      }
    }

    // 2. Local Fallback: Supervised TF-IDF Centroid Classifier + Transparent Priority Engine
    const localClassification = aiClassifier.predict(combinedText);
    const localCat = normalizeCategory(category || localClassification.predictedCategory);
    const localPriority = priorityEngine.evaluate({
      title,
      description,
      text: combinedText,
      category: localCat,
      location: location || ward
    });

    // Derive missing details heuristically
    const missing = [];
    const lower = combinedText.toLowerCase();
    if (!lower.includes('near') && !lower.includes('opposite') && !lower.includes('road') && !lower.includes('pillar') && !lower.includes('cross')) {
      missing.push('Nearest prominent landmark or metro pillar number');
    }
    if (localCat === 'Road / Pothole' && !lower.includes('deep') && !lower.includes('feet') && !lower.includes('size') && !lower.includes('meter')) {
      missing.push('Approximate width/depth of crater (e.g. 2 feet wide, 6 inches deep)');
    }
    if (!lower.includes('day') && !lower.includes('week') && !lower.includes('month') && !lower.includes('yesterday') && !lower.includes('today')) {
      missing.push('How long this issue has persisted (e.g. 3 days)');
    }

    const dept = DEPARTMENT_MAP[localCat] || DEPARTMENT_MAP['Road / Pothole'];

    return {
      success: true,
      source: 'local_ml_fallback',
      model: 'local-tfidf-centroid',
      data: {
        category: localCat,
        categoryReasoning: `Matched via TF-IDF centroid vector space (anchor signals: ${localClassification.topAnchors?.join(', ') || 'lexical similarity'}).`,
        priority: localPriority.priority,
        priorityReasoning: localPriority.factors.join(' ') || 'Standard category municipal SLA applies.',
        neutralSummary: title ? `${title} reported at ${ward || location || 'Bengaluru'}` : description.slice(0, 80),
        clarifiedDescription: description,
        missingDetails: missing,
        civicSafetyAdvice: localPriority.priority === 'Critical' ? 'Exercise extreme caution near this location.' : 'Municipal field assignment in progress.',
        safetyConcern: localPriority.priority === 'Critical' ? 'Exercise extreme caution near this location.' : 'Municipal field assignment in progress.',
        suggestedDepartment: dept,
        confidenceScore: localClassification.confidence,
        confidencePercent: `${Math.round(localClassification.confidence * 100)}%`,
        isLowConfidence: localClassification.isLowConfidence,
        aiEngine: 'Supervised TF-IDF Engine (Offline-Safe)'
      }
    };
  }

  /**
   * Rewrite / Clarify Endpoint:
   * Helps citizens rewrite vague or confusing reports into professional municipal work descriptions.
   */
  async rewriteComplaint({ title = '', description = '' }) {
    const client = this.getClient();
    if (!client || (!title && !description)) {
      // Fallback: simple cleanup
      const cleaned = (description || title || '').replace(/\s+/g, ' ').trim();
      return {
        success: true,
        source: 'local_cleanup',
        rewrittenTitle: title.trim(),
        rewrittenDescription: cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      };
    }

    try {
      const prompt = `You are CitySaathi AI. A citizen reported a civic issue in Bengaluru.
Rewrite their complaint into a concise, professional title (under 12 words) and an objective, well-structured description (under 60 words).
Do not change their intended meaning, do not add false facts or imaginary landmarks. Keep it respectful and clear for municipal field crews.

Input:
Title: "${title}"
Description: "${description}"

Return ONLY valid JSON:
{
  "rewrittenTitle": "<concise professional title>",
  "rewrittenDescription": "<objective clear description>"
}`;

      let response;
      let usedModel = this.primaryModel;
      try {
        response = await this.generateWithTimeout(
          client,
          this.primaryModel,
          prompt,
          { responseMimeType: 'application/json', temperature: 0.2 },
          7000
        );
      } catch (e1) {
        usedModel = this.fallbackModel;
        response = await this.generateWithTimeout(
          client,
          this.fallbackModel,
          prompt,
          { responseMimeType: 'application/json', temperature: 0.2 },
          6000
        );
      }

      const raw = response.text || (response.candidates && response.candidates[0]?.content?.parts[0]?.text);
      if (raw) {
        const parsed = JSON.parse(raw.trim());
        return {
          success: true,
          source: 'gemini',
          model: usedModel,
          rewrittenTitle: parsed.rewrittenTitle || title,
          rewrittenDescription: parsed.rewrittenDescription || description
        };
      }
    } catch (e) {
      console.warn('[CitySaathi AI] rewriteComplaint failed, returning original:', e.message);
    }

    return {
      success: true,
      source: 'local_cleanup',
      rewrittenTitle: title.trim(),
      rewrittenDescription: description.trim()
    };
  }

  /**
   * Generates an actionable, objective civic complaint draft using Google Gemini AI.
   * Enforces strict anti-hallucination guardrails:
   * 1. Uses the selected location as contextual information only (without inventing fake street addresses).
   * 2. Uses the citizen's description as the ONLY source of facts about the problem.
   * 3. Never invents damage, severity, duration, injuries, or affected residents.
   * 4. Never claims an authority verified the issue.
   * 5. Returns structured JSON with title, complaintMessage, category, locationSummary, suggestedPriority, reason.
   */
  async generateComplaintDraft({
    category = 'Road / Pothole',
    locationAddress = '',
    ward = 'Indiranagar (Ward 112)',
    latitude = 12.9784,
    longitude = 77.6408,
    citizenObservation = '',
    additionalDetails = '',
    severity = 'Normal'
  }) {
    const cleanObservation = (citizenObservation || '').trim();
    const cleanCategory = normalizeCategory(category);
    const cleanAddress = (locationAddress || '').trim();
    const cleanWard = (ward || '').trim();
    const cleanDetails = (additionalDetails || '').trim();
    const cleanSeverity = (severity || 'Normal').trim();

    const client = this.getClient();

    // 1. If Gemini API key is configured and valid observation provided, invoke Gemini
    if (client && cleanObservation.length >= 3) {
      try {
        const prompt = `You are CitySaathi AI, a civic-tech intelligence assistant for Bengaluru municipal administration (BBMP, BESCOM, BWSSB, Solid Waste Management).
Your task is to draft a professional, concise, actionable civic complaint message for municipal field crews using the citizen's actual observations and location context.

Location Context (for context only):
- Address / Landmark: "${cleanAddress || 'Address not specified'}"
- Ward / Zone: "${cleanWard || 'Bengaluru'}"
- GPS Coordinates: ${latitude && longitude ? `${Number(latitude).toFixed(4)}° N, ${Number(longitude).toFixed(4)}° E` : 'Not provided'}

Citizen Observation (source of truth):
- Selected Category: "${cleanCategory}"
- Observed Problem: "${cleanObservation}"
- Additional Observation Details: "${cleanDetails || 'None specified'}"
- Citizen Stated Severity: "${cleanSeverity}"

STRICT ANTI-HALLUCINATION & INTEGRITY RULES:
1. Use the selected location as contextual information only. Clearly distinguish unavailable location information from verified address information. Never invent an exact street address or ward if not provided.
2. Use the citizen's description as the ONLY source of facts about the problem.
3. NEVER invent damage, severity, duration, injuries, affected residents, vehicle accidents, or traffic disruptions not stated by the citizen.
4. NEVER claim that an authority or engineer has inspected or verified the issue.
5. Suggest a priority based strictly on municipal guidelines and the citizen's observation: "Critical", "High", "Medium", or "Low". Treat this priority strictly as a suggestion.
6. Keep the complaint message concise, objective, respectful, and actionable for municipal field engineers.
7. Produce a draft that the citizen can review and edit before submission.

Return ONLY a valid JSON object matching this schema:
{
  "title": "<Concise, professional title under 12 words>",
  "complaintMessage": "<Clear, professional, actionable municipal complaint message under 70 words directly reflecting citizen observations>",
  "category": "<One of: 'Road / Pothole' | 'Garbage / Waste' | 'Streetlight' | 'Water / Drainage' | 'Public Amenities'>",
  "locationSummary": "<Concise location summary e.g. '${cleanAddress ? cleanAddress + ', ' : ''}${cleanWard}'>",
  "suggestedPriority": "<'Critical' | 'High' | 'Medium' | 'Low'>",
  "reason": "<1-2 concise sentences explaining why this priority is suggested based on the citizen's observation>"
}`;

        let response;
        let usedModel = this.primaryModel;
        try {
          response = await this.generateWithTimeout(
            client,
            this.primaryModel,
            prompt,
            { responseMimeType: 'application/json', temperature: 0.2 },
            7000
          );
        } catch (primaryErr) {
          console.warn(`[CitySaathi AI] ${this.primaryModel} failed (${primaryErr.message}), trying ${this.fallbackModel}...`);
          usedModel = this.fallbackModel;
          response = await this.generateWithTimeout(
            client,
            this.fallbackModel,
            prompt,
            { responseMimeType: 'application/json', temperature: 0.2 },
            6000
          );
        }

        const rawText = response.text || (response.candidates && response.candidates[0]?.content?.parts[0]?.text);
        if (rawText) {
          const parsed = JSON.parse(rawText.trim());
          const finalCat = normalizeCategory(parsed.category || cleanCategory);
          const finalPriority = normalizePriority(parsed.suggestedPriority || (cleanSeverity === 'Critical' ? 'Critical' : (cleanSeverity === 'Urgent' ? 'High' : 'Medium')));
          const dept = DEPARTMENT_MAP[finalCat] || DEPARTMENT_MAP['Road / Pothole'];

          let locationSummary = parsed.locationSummary;
          if (!locationSummary || locationSummary.length < 3) {
            locationSummary = cleanAddress ? `${cleanAddress}, ${cleanWard}` : cleanWard;
          }

          return {
            success: true,
            source: 'gemini',
            isGemini: true,
            model: usedModel,
            draft: {
              title: parsed.title || `${finalCat} reported at ${cleanWard || 'Bengaluru'}`,
              complaintMessage: parsed.complaintMessage || cleanObservation,
              category: finalCat,
              locationSummary,
              suggestedPriority: finalPriority,
              reason: parsed.reason || 'Assessed based on reported civic conditions and municipal priority guidelines.',
              suggestedDepartment: dept,
              aiEngine: `Google Gemini (${usedModel})`
            },
            fallbackNotice: null
          };
        }
      } catch (geminiErr) {
        console.warn('[CitySaathi AI] Gemini draft generation failed, falling back to local engine:', geminiErr.message);
      }
    }

    // 2. Offline / Missing Key / Error Fallback: Local Supervised ML + Deterministic Rule Engine
    const localClassification = aiClassifier.predict(cleanObservation);
    const finalCat = normalizeCategory(cleanCategory || localClassification.predictedCategory);
    const localPriority = priorityEngine.evaluate({
      title: cleanObservation.slice(0, 50),
      description: cleanObservation,
      text: cleanObservation,
      category: finalCat,
      location: cleanAddress || cleanWard
    });

    const dept = DEPARTMENT_MAP[finalCat] || DEPARTMENT_MAP['Road / Pothole'];
    const locSummary = cleanAddress ? `${cleanAddress}, ${cleanWard}` : cleanWard;

    const draftTitle = `${finalCat} reported near ${cleanAddress || cleanWard}`;
    const draftMessage = `A ${finalCat.toLowerCase()} issue has been reported at ${locSummary}. Citizen observation: "${cleanObservation}". ${cleanDetails ? 'Additional note: ' + cleanDetails + '.' : ''} Please inspect the site and initiate appropriate municipal maintenance work.`;

    const isUnconfigured = !client;
    const fallbackNotice = isUnconfigured
      ? 'Gemini API key is unconfigured. Generated draft using CitySaathi local civic engine. You can freely edit all fields.'
      : 'Gemini service encountered a transient network/rate issue. Generated draft using local engine. You can freely edit or retry.';

    return {
      success: true,
      source: 'local_fallback',
      isGemini: false,
      model: 'local-rule-engine',
      draft: {
        title: draftTitle,
        complaintMessage: draftMessage,
        category: finalCat,
        locationSummary: locSummary,
        suggestedPriority: localPriority.priority || 'Medium',
        reason: (localPriority.factors && localPriority.factors.join(' ')) || 'Assessed using municipal standard category SLA rules.',
        suggestedDepartment: dept,
        aiEngine: 'Local Civic Engine (Deterministic Fallback)'
      },
      fallbackNotice
    };
  }
}

module.exports = new GeminiService();
