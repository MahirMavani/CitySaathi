/**
 * CitySaathi Transparent Priority Classification Engine
 * Evaluates safety hazards, severity descriptions, transit density, and corroboration volume.
 */

class PriorityEngine {
  constructor() {
    this.criticalHazardKeywords = [
      'electrocution', 'live wire', 'exposed wire', 'sparking', 'fire', 'open manhole',
      'deep crater', 'sinkhole', 'cave-in', 'collapsed', 'burst pipeline', 'ruptured pipe',
      'submerged', 'falling tree', 'leaning pole', 'gas leak', 'fatal', 'severe injury'
    ];

    this.urgentSeverityKeywords = [
      'major pothole', 'commercial dump', 'dead animal', 'complete darkness', 'pitch dark',
      'flooding', 'overflowing sewage', 'uncollected for days', 'toxic smoke', 'medical waste',
      'stagnant pool', 'foul stench', 'traffic gridlock', 'school zone', 'hospital'
    ];

    this.arterialTransitKeywords = [
      '100ft', 'ring road', 'outer ring', 'flyover', 'underpass', 'metro', 'junction',
      'signal', 'bus terminus', 'highway', 'mg road', 'arterial'
    ];
  }

  evaluate({ text, title = '', description = '', category = '', duplicateCount = 0, location = '' }) {
    const fullText = `${title} ${description} ${text || ''}`.toLowerCase();
    const locText = (location || '').toLowerCase();

    let score = 0;
    const factors = [];

    // Factor 1: Critical Safety Hazards (Weight: +40)
    const matchedCritical = this.criticalHazardKeywords.filter(k => fullText.includes(k));
    if (matchedCritical.length > 0) {
      score += 45;
      factors.push(`Critical Hazard Trigger: Detected safety terms [${matchedCritical.slice(0, 3).join(', ')}] requiring urgent field dispatch.`);
    }

    // Factor 2: High Severity Issues (Weight: +25)
    const matchedUrgent = this.urgentSeverityKeywords.filter(k => fullText.includes(k));
    if (matchedUrgent.length > 0) {
      score += 25;
      factors.push(`High Severity Trigger: Detected disturbance factors [${matchedUrgent.slice(0, 3).join(', ')}].`);
    }

    // Factor 3: Category Baseline
    if (category === 'Water / Drainage' && fullText.includes('drinking water')) {
      score += 15;
      factors.push('Resource Conservation: Potable water loss prioritized by municipal guidelines.');
    } else if (category === 'Streetlight' && (fullText.includes('wire') || fullText.includes('dark'))) {
      score += 15;
      factors.push('Public Night Safety: Public illumination defect on active pedestrian transit path.');
    } else if (category === 'Road / Pothole' && (fullText.includes('pothole') || fullText.includes('asphalt'))) {
      score += 10;
      factors.push('Road Defect: Impact on vehicular balance and two-wheeler commuting safety.');
    }

    // Factor 4: Transit Density Multiplier (Weight: +15)
    const isArterial = this.arterialTransitKeywords.some(k => fullText.includes(k) || locText.includes(k));
    if (isArterial) {
      score += 15;
      factors.push('Transit Density Multiplier: Located on a major Bengaluru arterial/transit corridor with high commuter volume.');
    }

    // Factor 5: Corroboration / Duplicate Volume Multiplier (Weight: up to +20)
    if (duplicateCount >= 4) {
      score += 25;
      factors.push(`High Public Corroboration: ${duplicateCount} citizens independently reported this defect.`);
    } else if (duplicateCount >= 2) {
      score += 15;
      factors.push(`Multiple Citizen Reports: Corroborated by ${duplicateCount} linked reports in proximity.`);
    }

    // Final Priority Determination
    let priority = 'Low';
    if (score >= 45) {
      priority = 'Critical';
    } else if (score >= 30) {
      priority = 'High';
    } else if (score >= 15) {
      priority = 'Medium';
    } else {
      factors.push('Standard Category Baseline: Routine municipal maintenance turnaround applies.');
    }

    return {
      priority,
      score,
      factors,
      evaluatedAt: new Date().toISOString()
    };
  }

  // Staff Override Handler
  override(currentPriority, newPriority, reason, staffName) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('A detailed reason is mandatory when overriding automated priority.');
    }

    return {
      priority: newPriority,
      isOverridden: true,
      originalPriority: currentPriority,
      overrideReason: reason.trim(),
      overriddenBy: staffName || 'Municipal Authority',
      overriddenAt: new Date().toISOString()
    };
  }
}

module.exports = new PriorityEngine();
