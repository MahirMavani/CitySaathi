/**
 * CitySaathi AI Controller
 * Exposes real-time complaint classification, transparent priority evaluation,
 * Gemini-powered assistance and rewriting, and ML model evaluation metrics.
 */

const aiClassifier = require('../services/aiClassifier');
const priorityEngine = require('../services/priorityEngine');
const geminiService = require('../services/geminiService');
const fastapiClient = require('../services/fastapiClient');

// 1. Classify complaint text in real time (as user types in report form)
async function classifyText(req, res) {
  try {
    const { text, title = '', description = '' } = req.body;
    const combined = `${title} ${description} ${text || ''}`.trim();

    if (!combined) {
      return res.status(400).json({
        success: false,
        error: 'Please provide text, title, or description to classify.'
      });
    }

    const aiResult = aiClassifier.predict(combined);
    const priorityResult = priorityEngine.evaluate({
      title,
      description,
      text: combined,
      category: aiResult.predictedCategory
    });

    return res.json({
      success: true,
      data: {
        category: aiResult.predictedCategory,
        confidence: aiResult.confidence,
        confidenceLevel: aiResult.confidenceLevel,
        isLowConfidence: aiResult.isLowConfidence,
        fallbackNotice: aiResult.fallbackNotice,
        probabilities: aiResult.probabilities,
        topAnchors: aiResult.topAnchors || [],
        priority: priorityResult.priority,
        priorityScore: priorityResult.score,
        priorityFactors: priorityResult.factors,
        slaHours: priorityResult.slaHours,
        geminiConfigured: geminiService.isConfigured()
      }
    });
  } catch (err) {
    console.error('AI classification error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process AI classification.'
    });
  }
}

// 2. Gemini-powered structured complaint assistance
async function geminiAssist(req, res) {
  try {
    const { title = '', description = '', text = '', category = '', ward = '', location = '' } = req.body;
    const targetDesc = description || text || '';

    if (!title && !targetDesc) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a title or description for AI assistance.'
      });
    }

    const result = await geminiService.assistComplaint({
      title,
      description: targetDesc,
      category,
      ward,
      location
    });

    const dataObj = result.data || {};
    const sourceLabel = result.source === 'gemini'
      ? `google-${result.model || 'gemini-2.0-flash'}`
      : 'citysaathi-supervised-ml-fallback';

    return res.json({
      success: true,
      source: sourceLabel,
      isGemini: result.source === 'gemini',
      model: result.model,
      data: dataObj,
      // Required validated structured properties:
      category: dataObj.category || category,
      suggestedCategory: dataObj.category || category,
      summary: dataObj.neutralSummary || title,
      priority: dataObj.priority || 'Medium',
      reason: dataObj.priorityReasoning || dataObj.categoryReasoning || '',
      safetyConcern: dataObj.safetyConcern || dataObj.civicSafetyAdvice || '',
      suggestedDepartment: dataObj.suggestedDepartment || null,
      // Helper aliases
      suggestedDescription: dataObj.clarifiedDescription || targetDesc,
      missingDetails: dataObj.missingDetails || [],
      safetyAdvice: dataObj.civicSafetyAdvice || '',
      urgencyScore: dataObj.priority === 'Critical' ? 9 : (dataObj.priority === 'High' ? 7 : 5)
    });
  } catch (err) {
    console.error('Gemini assist error:', err);
    return res.status(500).json({
      success: false,
      error: 'Gemini assistance encountered an error.'
    });
  }
}

// 3. Gemini-powered complaint rewrite/clarifier
async function geminiRewrite(req, res) {
  try {
    const { title = '', description = '', text = '' } = req.body;
    const targetDesc = description || text || '';

    if (!title && !targetDesc) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a title or description to rewrite.'
      });
    }

    const result = await geminiService.rewriteComplaint({ title, description: targetDesc });
    const rewritten = result.data?.rewrittenDescription || result.data?.clarifiedDescription || targetDesc;
    const sourceLabel = result.source === 'gemini'
      ? `google-${result.model || 'gemini-2.0-flash'}`
      : 'citysaathi-supervised-ml-fallback';

    return res.json({
      success: true,
      source: sourceLabel,
      isGemini: result.source === 'gemini',
      model: result.model,
      rewrittenText: rewritten,
      data: result.data || { rewrittenDescription: rewritten }
    });
  } catch (err) {
    console.error('Gemini rewrite error:', err);
    return res.status(500).json({
      success: false,
      error: 'Gemini rewriting encountered an error.'
    });
  }
}

// 4. Get Model Performance & Evaluation Metrics (for Presentation / Academic Defense)
async function getModelMetrics(req, res) {
  try {
    const evalResults = aiClassifier.evaluate(0.20);
    return res.json({
      success: true,
      metrics: {
        ...evalResults,
        geminiStatus: geminiService.isConfigured() ? 'Configured & Active' : 'Fallback Local Engine Active'
      }
    });
  } catch (err) {
    console.error('Model metrics error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to compute ML model metrics.'
    });
  }
}

// 5. Explainable Priority Calculation
async function analyzePriority(req, res) {
  try {
    const { title = '', description = '', category = '', duplicateCount = 0, location = '' } = req.body;

    // 1. Attempt evaluation via private Python FastAPI microservice
    const fastApiPrio = await fastapiClient.evaluatePriority({
      title,
      description,
      category,
      location,
      duplicateCount
    });

    if (fastApiPrio) {
      return res.json({
        success: true,
        source: 'python-fastapi-microservice',
        evaluation: fastApiPrio
      });
    }

    // 2. Fallback to local JavaScript priority engine
    const result = priorityEngine.evaluate({
      title,
      description,
      category,
      duplicateCount,
      location
    });

    return res.json({
      success: true,
      source: 'citysaathi-local-priority-engine',
      evaluation: result
    });
  } catch (err) {
    console.error('Priority analysis error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate priority.'
    });
  }
}

// 6. Check Gemini connection & configuration status safely without exposing key
async function getGeminiStatus(req, res) {
  try {
    const keyInfo = geminiService.getKeyStatus();
    let connection = { ok: false, status: 'untested' };

    if (req.query.test === 'true' && keyInfo.configured) {
      connection = await geminiService.testConnection();
    }

    return res.json({
      success: true,
      ...keyInfo,
      connection
    });
  } catch (err) {
    console.error('Gemini status check error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to check Gemini status.'
    });
  }
}

// 7. Gemini-powered location-first complaint draft generator
async function generateComplaintDraft(req, res) {
  try {
    const {
      category = 'Road / Pothole',
      locationAddress = '',
      location = '',
      ward = 'Indiranagar (Ward 112)',
      latitude,
      lat,
      longitude,
      lng,
      citizenObservation = '',
      description = '',
      text = '',
      additionalDetails = '',
      severity = 'Normal'
    } = req.body;

    const observationText = (citizenObservation || description || text || '').trim();

    if (!observationText || observationText.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Please describe the observed civic problem (minimum 3 characters).'
      });
    }

    const resolvedAddress = (locationAddress || location || '').trim();
    const resolvedLat = latitude !== undefined ? latitude : lat;
    const resolvedLng = longitude !== undefined ? longitude : lng;

    const result = await geminiService.generateComplaintDraft({
      category,
      locationAddress: resolvedAddress,
      ward,
      latitude: resolvedLat,
      longitude: resolvedLng,
      citizenObservation: observationText,
      additionalDetails,
      severity
    });

    return res.json({
      success: true,
      source: result.source,
      isGemini: result.isGemini,
      model: result.model,
      draft: result.draft,
      fallbackNotice: result.fallbackNotice
    });
  } catch (err) {
    console.error('generateComplaintDraft error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate complaint draft.'
    });
  }
}

module.exports = {
  classifyText,
  geminiAssist,
  geminiRewrite,
  getModelMetrics,
  analyzePriority,
  getGeminiStatus,
  generateComplaintDraft
};
