"""
CitySaathi Python FastAPI AI Microservice
Provides private internal endpoints for duplicate detection and complaint prioritization.
"""

import os
from datetime import datetime, timezone
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from .schemas import (
    AnalyzeComplaintRequest,
    AnalyzeComplaintResponse,
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    PriorityEvaluateRequest,
    PriorityRecommendation,
    HealthResponse
)
from .services.duplicate_detection import duplicate_engine
from .services.prioritization import prioritization_engine

# Load environment variables
load_dotenv()

INTERNAL_TOKEN = os.getenv("INTERNAL_AI_SERVICE_TOKEN", "cs_sec_token_dev_microservice_2026")
ALLOWED_ORIGINS_STR = os.getenv("ALLOWED_ORIGINS", "http://localhost:5000,http://127.0.0.1:5000")
ALLOWED_ORIGINS = [orig.strip() for orig in ALLOWED_ORIGINS_STR.split(",") if orig.strip()]

app = FastAPI(
    title="CitySaathi AI Microservice",
    description="Internal machine learning & deterministic triage service for CitySaathi",
    version="1.0.0",
    docs_url=None,  # Disabled public documentation in production/local isolation
    redoc_url=None
)

# Restrictive CORS (only allowed internal backend origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def verify_internal_token(
    x_internal_token: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None)
):
    """
    Validates shared secret token between Node.js backend and FastAPI.
    Accepts X-Internal-Token header or Authorization: Bearer <token>.
    """
    token = None
    if x_internal_token:
        token = x_internal_token.strip()
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()

    if not token or token != INTERNAL_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal service authorization token."
        )
    return True


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Service health check endpoint without exposing sensitive configuration."""
    return HealthResponse(
        status="healthy",
        service="CitySaathi AI Microservice",
        version="1.0.0",
        engine="FastAPI + scikit-learn"
    )


@app.post(
    "/internal/v1/analyze-complaint",
    response_model=AnalyzeComplaintResponse,
    dependencies=[Depends(verify_internal_token)],
    tags=["Analysis"]
)
async def analyze_complaint(payload: AnalyzeComplaintRequest):
    """
    Comprehensive internal analysis endpoint.
    Executes TF-IDF + Haversine duplicate detection against candidate complaints
    and evaluates explainable multi-factor prioritization.
    """
    duplicates = duplicate_engine.find_duplicate_candidates(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        latitude=payload.latitude,
        longitude=payload.longitude,
        ward=payload.ward,
        candidates=payload.candidates
    )

    priority = prioritization_engine.evaluate_priority(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        location=payload.ward or "",
        ward=payload.ward,
        duplicate_count=len(duplicates)
    )

    return AnalyzeComplaintResponse(
        success=True,
        complaint_id=payload.complaint_id,
        has_duplicate_candidates=len(duplicates) > 0,
        candidate_count=len(duplicates),
        duplicate_candidates=duplicates,
        priority_recommendation=priority,
        service_version="1.0.0",
        analysis_timestamp=datetime.now(timezone.utc).isoformat()
    )


@app.post(
    "/internal/v1/duplicates/check",
    response_model=DuplicateCheckResponse,
    dependencies=[Depends(verify_internal_token)],
    tags=["Duplicates"]
)
async def check_duplicates(payload: DuplicateCheckRequest):
    """Internal endpoint dedicated to ranking duplicate complaint candidates."""
    duplicates = duplicate_engine.find_duplicate_candidates(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        latitude=payload.latitude,
        longitude=payload.longitude,
        ward=payload.ward,
        candidates=payload.candidates
    )

    highest_sim = duplicates[0].composite_score if duplicates else 0.0

    return DuplicateCheckResponse(
        success=True,
        has_duplicates=len(duplicates) > 0,
        count=len(duplicates),
        highest_similarity=highest_sim,
        candidates=duplicates,
        analysis_method="scikit-learn TF-IDF + Haversine Geodesic"
    )


@app.post(
    "/internal/v1/priority/evaluate",
    response_model=PriorityRecommendation,
    dependencies=[Depends(verify_internal_token)],
    tags=["Priority"]
)
async def evaluate_priority(payload: PriorityEvaluateRequest):
    """Internal endpoint dedicated to transparent multi-factor priority evaluation."""
    return prioritization_engine.evaluate_priority(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        location=payload.location,
        ward=payload.ward,
        duplicate_count=payload.duplicate_count
    )


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("AI_SERVICE_HOST", "127.0.0.1")
    port = int(os.getenv("AI_SERVICE_PORT", "8000"))
    uvicorn.run("app.main:app", host=host, port=port, reload=False)
