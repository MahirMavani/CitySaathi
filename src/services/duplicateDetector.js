/**
 * CitySaathi Duplicate Complaint Detection Engine
 * Combines TF-IDF Cosine Text Similarity with Haversine Geolocation Proximity.
 * Avoids false positives from generic vocabulary like "road", "water", "problem".
 */

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'did', 'do',
  'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
  'he', 'her', 'here', 'hers', 'him', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just',
  'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'our', 'ours', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the',
  'their', 'theirs', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
  'with', 'you', 'your', 'yours',
  // Domain-generic civic words to avoid false positive duplicate matching
  'issue', 'problem', 'complaint', 'reported', 'please', 'near', 'opposite', 'area', 'ward', 'city', 'bengaluru'
]);

class DuplicateDetector {
  constructor(options = {}) {
    // Configurable thresholds
    this.textSimilarityThreshold = options.textSimilarityThreshold || 0.45;
    this.maxRadiusMeters = options.maxRadiusMeters || 600; // within 600 meters
    this.highConfidenceRadius = options.highConfidenceRadius || 250; // within 250 meters
  }

  // Tokenize & normalize into meaningful unigrams + bigrams
  tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    const clean = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = clean.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));
    const tokens = [...words];
    
    // Add bigrams for distinctive spatial or object phrasing (e.g., "crater_pothole", "metro_pillar")
    for (let i = 0; i < words.length - 1; i++) {
      tokens.push(`${words[i]}_${words[i + 1]}`);
    }
    return tokens;
  }

  // Compute Term Frequency vector
  computeTF(tokens) {
    const tf = {};
    if (tokens.length === 0) return tf;
    tokens.forEach(t => {
      tf[t] = (tf[t] || 0) + 1;
    });
    // Normalize by length
    for (const t in tf) {
      tf[t] = tf[t] / tokens.length;
    }
    return tf;
  }

  // Compute Cosine Similarity between two TF vectors
  cosineSimilarity(tf1, tf2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const token in tf1) {
      norm1 += tf1[token] * tf1[token];
      if (tf2[token]) {
        dotProduct += tf1[token] * tf2[token];
      }
    }

    for (const token in tf2) {
      norm2 += tf2[token] * tf2[token];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (norm1 * norm2);
  }

  // Haversine formula: calculates great-circle distance in meters between two lat/lng points
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined ||
        lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
      return null;
    }

    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  // Find candidate duplicate reports from a list of active complaints
  findDuplicates(newComplaint, activeComplaints = []) {
    const newTokens = this.tokenize(`${newComplaint.title} ${newComplaint.description}`);
    const newTF = this.computeTF(newTokens);
    const matches = [];

    activeComplaints.forEach(existing => {
      // Don't compare with self
      if (existing.id && newComplaint.id && existing.id === newComplaint.id) return;
      if (existing.complaintCode && newComplaint.complaintCode && existing.complaintCode === newComplaint.complaintCode) return;

      // Category check: Must be same category
      if (existing.category && newComplaint.category && existing.category !== newComplaint.category) {
        return; // Ignore complaints from completely different departments
      }

      const existingTokens = this.tokenize(`${existing.title} ${existing.description}`);
      const existingTF = this.computeTF(existingTokens);
      const textSimilarity = this.cosineSimilarity(newTF, existingTF);

      // Geographic distance calculation
      let distanceMeters = null;
      let geoProximityScore = 0;
      let isWithinRadius = false;

      if (newComplaint.latitude && newComplaint.longitude && existing.latitude && existing.longitude) {
        distanceMeters = this.calculateDistance(
          newComplaint.latitude, newComplaint.longitude,
          existing.latitude, existing.longitude
        );

        if (distanceMeters !== null) {
          if (distanceMeters <= this.highConfidenceRadius) {
            geoProximityScore = 1.0;
            isWithinRadius = true;
          } else if (distanceMeters <= this.maxRadiusMeters) {
            geoProximityScore = 1.0 - ((distanceMeters - this.highConfidenceRadius) / (this.maxRadiusMeters - this.highConfidenceRadius)) * 0.5;
            isWithinRadius = true;
          } else {
            // Distance is too large (> 600m): significantly reduce duplicate probability
            geoProximityScore = 0.1;
            isWithinRadius = false;
          }
        }
      } else {
        // Fallback to text + ward matching if coordinates not available
        const sameWard = newComplaint.ward && existing.ward && newComplaint.ward === existing.ward;
        geoProximityScore = sameWard ? 0.75 : 0.40;
      }

      // Composite match score:
      // If coordinates are available, combine text similarity (60%) and geo proximity (40%)
      let compositeScore = 0;
      if (distanceMeters !== null) {
        if (!isWithinRadius) {
          // If physically far apart (> 600m), it cannot be the exact same pothole/broken streetlight!
          compositeScore = textSimilarity * 0.25;
        } else {
          compositeScore = (textSimilarity * 0.55) + (geoProximityScore * 0.45);
        }
      } else {
        compositeScore = (textSimilarity * 0.70) + (geoProximityScore * 0.30);
      }

      // Decision criteria:
      // Either high text similarity in proximity, or high composite score
      if (compositeScore >= this.textSimilarityThreshold || (textSimilarity >= 0.60 && isWithinRadius)) {
        let matchReason = '';
        if (distanceMeters !== null && distanceMeters <= this.highConfidenceRadius) {
          matchReason = `High spatial proximity (${distanceMeters}m away) in same category [${existing.category}] with ${(textSimilarity * 100).toFixed(0)}% description overlap.`;
        } else if (distanceMeters !== null) {
          matchReason = `Within neighborhood radius (${distanceMeters}m) with ${(textSimilarity * 100).toFixed(0)}% textual similarity.`;
        } else {
          matchReason = `High textual similarity (${(textSimilarity * 100).toFixed(0)}%) in same ward.`;
        }

        matches.push({
          complaintId: existing.id,
          complaintCode: existing.complaintCode,
          title: existing.title,
          category: existing.category,
          status: existing.status,
          priority: existing.priority,
          distanceMeters,
          distanceText: distanceMeters !== null ? `${distanceMeters}m away` : 'Nearby ward',
          textSimilarity: Math.round(textSimilarity * 100) / 100,
          similarityPercent: `${Math.round(compositeScore * 100)}%`,
          compositeScore: Math.round(compositeScore * 100) / 100,
          matchReason,
          createdAt: existing.createdAt
        });
      }
    });

    // Sort candidates by highest composite match score
    return matches.sort((a, b) => b.compositeScore - a.compositeScore);
  }
}

module.exports = new DuplicateDetector();
