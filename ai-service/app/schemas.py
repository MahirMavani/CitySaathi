"""
CitySaathi AI Microservice - Pydantic Request & Response Schemas
Defines strict validation rules, coordinate boundaries, and explainable models.
"""

from enum import Enum
from typing import List, Optional, Union
from pydantic import BaseModel, Field, field_validator


class ComplaintCategory(str, Enum):
    ROAD_POTHOLE = "Road / Pothole"
    GARBAGE_WASTE = "Garbage / Waste"
    STREETLIGHT = "Streetlight"
    WATER_DRAINAGE = "Water / Drainage"
    PUBLIC_AMENITIES = "Public Amenities"


class ComplaintPriority(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class CandidateComplaint(BaseModel):
    id: Union[int, str] = Field(..., description="Complaint identifier from database")
    complaint_code: Optional[str] = Field(None, description="Human-readable code e.g. CS-2026-00084")
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1, max_length=5000)
    category: str = Field(..., description="Municipal category")
    status: Optional[str] = Field("Submitted", description="Lifecycle status")
    priority: Optional[str] = Field("Medium", description="Assigned priority")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="WGS84 latitude")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="WGS84 longitude")
    ward: Optional[str] = Field(None, max_length=100)


class AnalyzeComplaintRequest(BaseModel):
    complaint_id: Optional[Union[int, str]] = Field(None, description="Optional ID if complaint already registered")
    title: str = Field(..., min_length=2, max_length=300, description="Complaint title")
    description: str = Field(..., min_length=2, max_length=3000, description="Citizen problem observation")
    category: str = Field(..., description="Target municipal category")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    ward: Optional[str] = Field(None, max_length=100)
    candidates: List[CandidateComplaint] = Field(default_factory=list, description="Active candidate complaints retrieved by Node.js")

    @field_validator('title', 'description')
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class DuplicateCheckRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=300)
    description: str = Field(..., min_length=2, max_length=3000)
    category: str = Field(...)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    ward: Optional[str] = Field(None, max_length=100)
    candidates: List[CandidateComplaint] = Field(default_factory=list)


class DuplicateCandidateMatch(BaseModel):
    complaint_id: Union[int, str]
    complaint_code: Optional[str] = None
    title: str
    category: str
    status: Optional[str] = "Submitted"
    priority: Optional[str] = "Medium"
    text_similarity: float = Field(..., ge=0.0, le=1.0, description="Cosine similarity on TF-IDF vectors")
    geographic_distance_meters: Optional[float] = Field(None, description="Great circle Haversine distance in meters")
    category_compatible: bool = Field(True, description="Whether municipal categories match")
    composite_score: float = Field(..., ge=0.0, le=1.0, description="Combined spatial + textual ranking score")
    match_reason: str = Field(..., description="Human-interpretable explanation of the duplicate signal")
    warnings: List[str] = Field(default_factory=list, description="Quality caveats e.g. missing coordinates")


class DuplicateCheckResponse(BaseModel):
    success: bool = True
    has_duplicates: bool = False
    count: int = 0
    highest_similarity: float = 0.0
    candidates: List[DuplicateCandidateMatch] = Field(default_factory=list)
    analysis_method: str = "scikit-learn TF-IDF + Haversine Geodesic"


class PriorityEvaluateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=300)
    description: str = Field(..., min_length=2, max_length=3000)
    category: str = Field(...)
    location: Optional[str] = Field("", max_length=300)
    ward: Optional[str] = Field(None, max_length=100)
    duplicate_count: int = Field(0, ge=0)


class PriorityRecommendation(BaseModel):
    suggested_priority: ComplaintPriority
    priority_score: int = Field(..., ge=0, le=100)
    explanation: str
    signals_used: List[str] = Field(default_factory=list)
    missing_evidence: List[str] = Field(default_factory=list)
    analysis_method: str = "Deterministic Rule-Based Triage Engine v1.0"


class AnalyzeComplaintResponse(BaseModel):
    success: bool = True
    complaint_id: Optional[Union[int, str]] = None
    has_duplicate_candidates: bool = False
    candidate_count: int = 0
    duplicate_candidates: List[DuplicateCandidateMatch] = Field(default_factory=list)
    priority_recommendation: PriorityRecommendation
    service_version: str = "1.0.0"
    analysis_timestamp: str


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "CitySaathi AI Microservice"
    version: str = "1.0.0"
    engine: str = "FastAPI + scikit-learn"
