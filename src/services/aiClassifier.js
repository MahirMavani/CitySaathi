/**
 * CitySaathi AI Complaint Classification Engine
 * Supervised TF-IDF Vector Space & Cosine Similarity Classifier
 * Features:
 *  - Stratified Train/Test evaluation with Confusion Matrix, Precision, Recall, F1
 *  - Calibrated probability confidence scoring
 *  - Low-confidence threshold detection with fallback guidance
 *  - Persistent model caching
 */

const fs = require('fs');
const path = require('path');

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'did', 'do',
  'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
  'he', 'her', 'here', 'hers', 'him', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just',
  'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'our', 'ours', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the',
  'their', 'theirs', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
  'with', 'you', 'your', 'yours', 'please', 'near', 'opposite'
]);

// Domain core anchors that strongly signal civic categories
const ANCHOR_TERMS = {
  'Road / Pothole': ['pothole', 'potholes', 'crater', 'asphalt', 'tar', 'macadam', 'paver', 'footpath', 'sidewalk', 'curb', 'median', 'sinkhole', 'cave-in', 'manhole', 'road_crater'],
  'Garbage / Waste': ['garbage', 'waste', 'trash', 'dump', 'dumpster', 'dumping', 'blackspot', 'litter', 'plastic', 'carcass', 'stench', 'rotting', 'odor', 'debris'],
  'Streetlight': ['streetlight', 'streetlights', 'lamp', 'lamppost', 'lighting', 'illumination', 'bulb', 'flickering', 'darkness', 'wire', 'wiring', 'fuse', 'bescom', 'luminaire'],
  'Water / Drainage': ['water', 'drain', 'drainage', 'pipeline', 'pipe', 'sewer', 'sewage', 'gutter', 'leakage', 'leaking', 'burst', 'flooding', 'waterlogging', 'bwssb', 'cauvery', 'stormwater'],
  'Public Amenities': ['park', 'bench', 'shelter', 'signboard', 'sign', 'signal', 'toilet', 'bus_stop', 'playground', 'tree_branch', 'railing', 'zebra_crossing', 'fountain', 'skywalk']
};

class AIClassifier {
  constructor() {
    this.categories = [
      'Road / Pothole',
      'Garbage / Waste',
      'Streetlight',
      'Water / Drainage',
      'Public Amenities'
    ];
    this.centroids = {};
    this.documentFrequency = {};
    this.totalDocuments = 0;
    this.vocabulary = new Set();
    this.trained = false;
    this.modelPath = path.join(__dirname, '../../data/ai_model.json');
    this.datasetPath = path.join(__dirname, '../../data/civic_dataset.json');

    this.categories.forEach(cat => {
      this.centroids[cat] = {};
    });

    this.loadOrTrain();
  }

  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    const clean = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = clean.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));
    const tokens = [...words];

    for (let i = 0; i < words.length - 1; i++) {
      tokens.push(`${words[i]}_${words[i + 1]}`);
    }
    return tokens;
  }

  getIDF(token) {
    const df = this.documentFrequency[token] || 0;
    return Math.log(1 + (this.totalDocuments / (df + 1)));
  }

  train(documents) {
    this.totalDocuments = documents.length;
    this.vocabulary = new Set();
    this.documentFrequency = {};
    this.centroids = {};

    this.categories.forEach(cat => {
      this.centroids[cat] = {};
    });

    // 1. Calculate Document Frequencies
    documents.forEach(doc => {
      const tokens = new Set(this.tokenize(doc.text));
      tokens.forEach(t => {
        this.vocabulary.add(t);
        this.documentFrequency[t] = (this.documentFrequency[t] || 0) + 1;
      });
    });

    // 2. Build Category Centroid Vectors
    documents.forEach(doc => {
      const cat = doc.category;
      if (!this.centroids[cat]) this.centroids[cat] = {};

      const tokens = this.tokenize(doc.text);
      const tf = {};
      tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });

      for (const t in tf) {
        let weight = (tf[t] / tokens.length) * this.getIDF(t);
        
        // Anchor boost for distinctive civic vocabulary
        if (ANCHOR_TERMS[cat] && ANCHOR_TERMS[cat].includes(t)) {
          weight *= 2.0;
        }

        this.centroids[cat][t] = (this.centroids[cat][t] || 0) + weight;
      }
    });

    this.trained = true;
    this.saveModel();
  }

  predict(text) {
    if (!this.trained) {
      this.loadOrTrain();
    }

    const tokens = this.tokenize(text);
    if (tokens.length === 0) {
      return {
        predictedCategory: 'Public Amenities',
        confidence: 0.20,
        confidencePercent: '20.0%',
        isLowConfidence: true,
        reason: 'No sufficient descriptive text provided for classification.',
        suggestions: this.categories.map(cat => ({ category: cat, score: 0.20 })),
        extractedKeywords: []
      };
    }

    // Build document TF-IDF vector
    const docVec = {};
    const tf = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });

    for (const t in tf) {
      docVec[t] = (tf[t] / tokens.length) * this.getIDF(t);
    }

    // Compute Cosine Similarity against each category centroid
    const rawScores = {};
    const matchedKeywords = {};

    this.categories.forEach(cat => {
      const cVec = this.centroids[cat] || {};
      let dot = 0;
      let norm1 = 0;
      let norm2 = 0;
      matchedKeywords[cat] = [];

      for (const t in docVec) {
        norm1 += docVec[t] * docVec[t];
        if (cVec[t]) {
          let termScore = docVec[t] * cVec[t];
          // Anchor term reinforcement
          if (ANCHOR_TERMS[cat] && ANCHOR_TERMS[cat].includes(t)) {
            termScore *= 1.8;
            matchedKeywords[cat].push({ token: t, weight: termScore });
          } else {
            matchedKeywords[cat].push({ token: t, weight: termScore });
          }
          dot += termScore;
        }
      }

      for (const t in cVec) {
        norm2 += cVec[t] * cVec[t];
      }

      const cosine = (norm1 && norm2) ? dot / (Math.sqrt(norm1) * Math.sqrt(norm2)) : 0;
      rawScores[cat] = Math.max(0, cosine);
    });

    // Softmax normalization for calibrated confidence
    const maxVal = Math.max(...Object.values(rawScores));
    let expSum = 0;
    const expScores = {};

    this.categories.forEach(cat => {
      // Temperature scaled for confidence calibration
      expScores[cat] = Math.exp((rawScores[cat] - maxVal) * 5.0);
      expSum += expScores[cat];
    });

    const suggestions = this.categories.map(cat => {
      const prob = expSum > 0 ? expScores[cat] / expSum : 0.20;
      return {
        category: cat,
        score: Math.round(prob * 1000) / 1000,
        rawCosine: Math.round((rawScores[cat] || 0) * 1000) / 1000
      };
    }).sort((a, b) => b.score - a.score);

    const top = suggestions[0];
    const second = suggestions[1] || { score: 0 };

    // Low confidence threshold: confidence < 0.45 or margin between top 2 is < 0.12
    const isLowConfidence = top.score < 0.45 || (top.score - second.score) < 0.12;

    const topKeywords = (matchedKeywords[top.category] || [])
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .map(k => k.token.replace('_', ' '));

    return {
      predictedCategory: top.category,
      confidence: top.score,
      confidencePercent: `${(top.score * 100).toFixed(1)}%`,
      isLowConfidence,
      suggestions,
      extractedKeywords: topKeywords
    };
  }

  evaluate(testRatio = 0.20) {
    let dataset = [];
    try {
      dataset = JSON.parse(fs.readFileSync(this.datasetPath, 'utf8'));
    } catch (e) {
      console.error('Failed to read dataset:', e.message);
      return null;
    }

    // Stratified split (balanced representation across all 5 classes)
    const byCat = {};
    dataset.forEach(d => {
      if (!byCat[d.category]) byCat[d.category] = [];
      byCat[d.category].push(d);
    });

    const trainData = [];
    const testData = [];

    Object.keys(byCat).forEach(cat => {
      const items = byCat[cat];
      const split = Math.floor(items.length * (1 - testRatio));
      trainData.push(...items.slice(0, split));
      testData.push(...items.slice(split));
    });

    // Train on trainData
    this.train(trainData);

    // Evaluate on testData
    let correct = 0;
    const perClass = {};
    this.categories.forEach(cat => {
      perClass[cat] = { tp: 0, fp: 0, fn: 0, total: 0 };
    });

    const confusionMatrix = {};
    this.categories.forEach(c1 => {
      confusionMatrix[c1] = {};
      this.categories.forEach(c2 => { confusionMatrix[c1][c2] = 0; });
    });

    testData.forEach(item => {
      const pred = this.predict(item.text).predictedCategory;
      const actual = item.category;

      if (perClass[actual]) perClass[actual].total++;
      if (confusionMatrix[actual]) confusionMatrix[actual][pred]++;

      if (pred === actual) {
        correct++;
        if (perClass[actual]) perClass[actual].tp++;
      } else {
        if (perClass[pred]) perClass[pred].fp++;
        if (perClass[actual]) perClass[actual].fn++;
      }
    });

    const overallAccuracy = correct / testData.length;
    const categoryMetrics = {};

    this.categories.forEach(cat => {
      const stats = perClass[cat];
      const precision = stats.tp + stats.fp > 0 ? stats.tp / (stats.tp + stats.fp) : 0;
      const recall = stats.tp + stats.fn > 0 ? stats.tp / (stats.tp + stats.fn) : 0;
      const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
      categoryMetrics[cat] = {
        precision: Math.round(precision * 100) / 100,
        recall: Math.round(recall * 100) / 100,
        f1Score: Math.round(f1 * 100) / 100,
        testSamples: stats.total
      };
    });

    // Retrain on full dataset for live system serving
    this.train(dataset);

    return {
      totalSamples: dataset.length,
      trainSamples: trainData.length,
      testSamples: testData.length,
      overallAccuracy: Math.round(overallAccuracy * 1000) / 10,
      accuracyPercent: `${(overallAccuracy * 100).toFixed(1)}%`,
      categoryMetrics,
      confusionMatrix
    };
  }

  saveModel() {
    const data = {
      categories: this.categories,
      vocabulary: Array.from(this.vocabulary),
      documentFrequency: this.documentFrequency,
      totalDocuments: this.totalDocuments,
      centroids: this.centroids,
      updatedAt: new Date().toISOString()
    };
    try {
      const dir = path.dirname(this.modelPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.modelPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not save AI model cache:', e.message);
    }
  }

  loadOrTrain() {
    if (fs.existsSync(this.modelPath)) {
      try {
        const raw = fs.readFileSync(this.modelPath, 'utf8');
        const data = JSON.parse(raw);
        this.categories = data.categories || this.categories;
        this.vocabulary = new Set(data.vocabulary || []);
        this.documentFrequency = data.documentFrequency || {};
        this.totalDocuments = data.totalDocuments || 0;
        this.centroids = data.centroids || {};
        this.trained = true;
        return;
      } catch (e) {
        console.warn('Corrupt model cache, retraining...');
      }
    }

    if (fs.existsSync(this.datasetPath)) {
      try {
        const docs = JSON.parse(fs.readFileSync(this.datasetPath, 'utf8'));
        this.train(docs);
      } catch (e) {
        console.error('Failed to initialize AI dataset:', e.message);
      }
    }
  }
}

module.exports = new AIClassifier();
