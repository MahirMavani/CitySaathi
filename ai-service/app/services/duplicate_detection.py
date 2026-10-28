"""
CitySaathi AI Microservice - Duplicate Detection Service
Utilizes scikit-learn TfidfVectorizer for n-gram textual similarity
combined with Haversine geodesic distance calculation.
"""

import math
from typing import List, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from ..schemas import CandidateComplaint, DuplicateCandidateMatch


CIVIC_STOP_WORDS = [
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'did', 'do',
    'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
    'he', 'her', 'here', 'hers', 'him', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just',
    'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
    'our', 'ours', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the',
    'their', 'theirs', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
    'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
    'with', 'you', 'your', 'yours',
    'issue', 'problem', 'complaint', 'reported', 'please', 'near', 'opposite', 'area', 'ward', 'city', 'bengaluru'
]


class DuplicateDetectionEngine:
    def __init__(
        self,
        text_threshold: float = 0.40,
        high_confidence_radius_m: float = 250.0,
        max_radius_m: float = 600.0
    ):
        self.text_threshold = text_threshold
        self.high_confidence_radius_m = high_confidence_radius_m
        self.max_radius_m = max_radius_m

    @staticmethod
    def haversine_distance(
        lat1: Optional[float], lon1: Optional[float],
        lat2: Optional[float], lon2: Optional[float]
    ) -> Optional[float]:
        """Calculates great-circle distance between two GPS points in meters."""
        if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
            return None

        # Earth's mean radius in meters
        R = 6371000.0
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (
            math.sin(d_lat / 2.0) ** 2 +
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
            math.sin(d_lon / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return round(R * c, 1)

    def find_duplicate_candidates(
        self,
        title: str,
        description: str,
        category: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        ward: Optional[str] = None,
        candidates: Optional[List[CandidateComplaint]] = None
    ) -> List[DuplicateCandidateMatch]:
        """
        Evaluates input complaint against candidate complaints provided by Node.js.
        Returns a ranked list of candidate matches with explainable scores and warnings.
        """
        if not candidates:
            return []

        target_text = f"{title} {description}".strip()
        if len(target_text) < 4:
            return []

        matches: List[DuplicateCandidateMatch] = []

        # Filter candidate corpus
        valid_candidates: List[CandidateComplaint] = []
        candidate_texts: List[str] = []

        for cand in candidates:
            cand_text = f"{cand.title} {cand.description}".strip()
            valid_candidates.append(cand)
            candidate_texts.append(cand_text)

        if not valid_candidates:
            return []

        # Compute TF-IDF text similarity using scikit-learn with unigrams and bigrams
        corpus = [target_text] + candidate_texts
        vectorizer = TfidfVectorizer(
            stop_words=CIVIC_STOP_WORDS,
            ngram_range=(1, 2),
            min_df=1,
            sublinear_tf=True
        )

        try:
            tfidf_matrix = vectorizer.fit_transform(corpus)
            cos_similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
        except Exception:
            cos_similarities = [0.0] * len(valid_candidates)

        for idx, cand in enumerate(valid_candidates):
            text_sim = float(cos_similarities[idx])
            warnings: List[str] = []

            # 1. Category Compatibility Check
            is_same_category = (
                cand.category.lower().strip() == category.lower().strip()
                if cand.category and category else True
            )

            if not is_same_category:
                # Different categories at same or nearby spot are distinct municipal issues
                continue

            # 2. Geographic Proximity Check
            dist_meters = self.haversine_distance(
                latitude, longitude,
                cand.latitude, cand.longitude
            )

            is_within_radius = False
            geo_proximity_score = 0.0

            if dist_meters is not None:
                if dist_meters <= self.high_confidence_radius_m:
                    geo_proximity_score = 1.0
                    is_within_radius = True
                elif dist_meters <= self.max_radius_m:
                    geo_proximity_score = 1.0 - (
                        (dist_meters - self.high_confidence_radius_m) /
                        (self.max_radius_m - self.high_confidence_radius_m)
                    ) * 0.5
                    is_within_radius = True
                else:
                    # Physically far apart (> 600m): heavily penalize
                    geo_proximity_score = 0.05
                    is_within_radius = False
                    warnings.append(f"Located {int(dist_meters)}m away (exceeds 600m neighborhood threshold)")
            else:
                warnings.append("Coordinates unavailable; spatial proximity estimated from ward context.")
                same_ward = (
                    ward is not None and cand.ward is not None and
                    ward.lower().strip() == cand.ward.lower().strip()
                )
                geo_proximity_score = 0.70 if same_ward else 0.35

            # 3. Composite Ranking Score
            if dist_meters is not None:
                if not is_within_radius:
                    # Distant reports cannot be the same pothole/light even if description is similar
                    composite = text_sim * 0.20
                else:
                    composite = (text_sim * 0.55) + (geo_proximity_score * 0.45)
            else:
                composite = (text_sim * 0.70) + (geo_proximity_score * 0.30)

            composite = max(0.0, min(1.0, round(composite, 2)))
            text_sim_rounded = max(0.0, min(1.0, round(text_sim, 2)))

            # 4. Check whether score meets ranking candidate criteria
            if composite >= self.text_threshold or (text_sim_rounded >= 0.55 and is_within_radius):
                if dist_meters is not None and dist_meters <= self.high_confidence_radius_m:
                    reason = f"High spatial proximity ({int(dist_meters)}m away) in same category [{cand.category}] with {int(text_sim_rounded * 100)}% description overlap."
                elif dist_meters is not None and is_within_radius:
                    reason = f"Within neighborhood radius ({int(dist_meters)}m) with {int(text_sim_rounded * 100)}% textual similarity."
                else:
                    reason = f"High textual similarity ({int(text_sim_rounded * 100)}%) in same ward."

                if cand.status in ['Resolved', 'Verified']:
                    warnings.append(f"Candidate #{cand.id} was previously marked '{cand.status}'. Possible recurring issue.")

                matches.append(DuplicateCandidateMatch(
                    complaint_id=cand.id,
                    complaint_code=cand.complaint_code,
                    title=cand.title,
                    category=cand.category,
                    status=cand.status or "Submitted",
                    priority=cand.priority or "Medium",
                    text_similarity=text_sim_rounded,
                    geographic_distance_meters=dist_meters,
                    category_compatible=True,
                    composite_score=composite,
                    match_reason=reason,
                    warnings=warnings
                ))

        # Rank candidates by composite score descending
        return sorted(matches, key=lambda m: m.composite_score, reverse=True)


duplicate_engine = DuplicateDetectionEngine()
