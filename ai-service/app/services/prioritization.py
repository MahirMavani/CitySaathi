"""
CitySaathi AI Microservice - Priority Recommendation Service
Calculates explainable, deterministic municipal triage priorities
based on public safety hazards, transit corridor density, and spatial corroboration.
"""

from typing import List, Optional
from ..schemas import ComplaintPriority, PriorityRecommendation


CRITICAL_HAZARD_KEYWORDS = [
    'electrocution', 'live wire', 'exposed wire', 'sparking', 'fire', 'open manhole',
    'deep crater', 'sinkhole', 'cave-in', 'collapsed', 'burst pipeline', 'ruptured pipe',
    'submerged', 'falling tree', 'leaning pole', 'gas leak', 'fatal', 'severe injury'
]

URGENT_SEVERITY_KEYWORDS = [
    'major pothole', 'commercial dump', 'dead animal', 'complete darkness', 'pitch dark',
    'flooding', 'overflowing sewage', 'uncollected for days', 'toxic smoke', 'medical waste',
    'stagnant pool', 'foul stench', 'traffic gridlock', 'school zone', 'hospital'
]

ARTERIAL_TRANSIT_KEYWORDS = [
    '100ft', 'ring road', 'outer ring', 'flyover', 'underpass', 'metro', 'junction',
    'signal', 'bus terminus', 'highway', 'mg road', 'arterial'
]


class PrioritizationEngine:
    def __init__(self):
        self.critical_keywords = CRITICAL_HAZARD_KEYWORDS
        self.urgent_keywords = URGENT_SEVERITY_KEYWORDS
        self.transit_keywords = ARTERIAL_TRANSIT_KEYWORDS

    def evaluate_priority(
        self,
        title: str,
        description: str,
        category: str,
        location: Optional[str] = "",
        ward: Optional[str] = None,
        duplicate_count: int = 0
    ) -> PriorityRecommendation:
        """
        Evaluates transparent civic priority without hallucinating unobserved facts.
        """
        full_text = f"{title} {description}".lower()
        loc_text = f"{location or ''} {ward or ''}".lower()

        score = 0
        signals_used: List[str] = []
        missing_evidence: List[str] = []

        # 1. Critical Safety Hazards (+45 pts)
        matched_critical = [k for k in self.critical_keywords if k in full_text]
        if matched_critical:
            score += 45
            signals_used.append(
                f"Critical Hazard Signal: Detected safety terms [{', '.join(matched_critical[:3])}] requiring urgent field dispatch."
            )

        # 2. Urgent Impact / Severe Sanitation (+25 pts)
        matched_urgent = [k for k in self.urgent_keywords if k in full_text]
        if matched_urgent:
            score += 25
            signals_used.append(
                f"High Severity Signal: Detected disturbance factors [{', '.join(matched_urgent[:3])}]."
            )

        # 3. Category Baseline Guidelines (+10 to +15 pts)
        if category == 'Water / Drainage' and 'drinking water' in full_text:
            score += 15
            signals_used.append("Resource Conservation: Potable water pipeline loss prioritized by municipal guidelines.")
        elif category == 'Streetlight' and ('wire' in full_text or 'dark' in full_text):
            score += 15
            signals_used.append("Public Night Safety: Public illumination defect on active transit path.")
        elif category == 'Road / Pothole' and ('pothole' in full_text or 'asphalt' in full_text):
            score += 10
            signals_used.append("Road Safety: Impact on vehicular balance and two-wheeler commuting stability.")

        # 4. Transit Corridor Density (+15 pts)
        is_arterial = any(k in full_text or k in loc_text for k in self.transit_keywords)
        if is_arterial:
            score += 15
            signals_used.append("Transit Corridor Multiplier: Located on a primary Bengaluru arterial or metro corridor with high traffic volume.")

        # 5. Spatial Corroboration / Duplicate Volume Multiplier (+15 to +25 pts)
        if duplicate_count >= 4:
            score += 25
            signals_used.append(f"High Public Corroboration: {duplicate_count} citizens independently reported this defect.")
        elif duplicate_count >= 2:
            score += 15
            signals_used.append(f"Multiple Citizen Reports: Corroborated by {duplicate_count} linked reports in proximity.")

        # Missing Information / Quality Assessment
        if not any(w in full_text for w in ['feet', 'meter', 'inch', 'size', 'deep', 'wide']):
            missing_evidence.append("Approximate dimensions/depth of defect not specified.")
        if not any(w in full_text for w in ['day', 'week', 'month', 'yesterday', 'today']):
            missing_evidence.append("Duration of issue persistence omitted.")
        if not location and not ward:
            missing_evidence.append("Specific street landmark or ward name missing.")

        # Determine Priority Level
        if score >= 45:
            suggested = ComplaintPriority.CRITICAL
            explanation = "Classified as Critical due to immediate threat to vehicular stability, pedestrian physical safety, or live infrastructure hazard."
        elif score >= 30:
            suggested = ComplaintPriority.HIGH
            explanation = "Classified as High due to heavy disruption to transit flow, sanitary hazards, or location on a high-density arterial corridor."
        elif score >= 15:
            suggested = ComplaintPriority.MEDIUM
            explanation = "Classified as Medium: Standard municipal category maintenance SLA applies."
        else:
            suggested = ComplaintPriority.LOW
            explanation = "Classified as Low: Non-hazardous routine maintenance or aesthetic amenity restoration."
            signals_used.append("Standard Municipal Baseline: Routine maintenance workflow applies.")

        return PriorityRecommendation(
            suggested_priority=suggested,
            priority_score=min(100, score),
            explanation=explanation,
            signals_used=signals_used,
            missing_evidence=missing_evidence,
            analysis_method="CitySaathi Deterministic Multi-Factor Triage Engine v1.0"
        )


prioritization_engine = PrioritizationEngine()
