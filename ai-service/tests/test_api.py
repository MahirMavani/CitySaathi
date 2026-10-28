"""
CitySaathi Python AI Microservice - Automated Test Suite
Covers health checks, auth token validation, duplicate detection edge cases,
and multi-factor prioritization logic.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app, INTERNAL_TOKEN

client = TestClient(app)
AUTH_HEADERS = {"X-Internal-Token": INTERNAL_TOKEN}


def test_health_endpoint():
    """Health check endpoint should return 200 without exposing secrets."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "CitySaathi AI Microservice"
    assert "token" not in data
    assert "secret" not in data


def test_auth_token_enforcement():
    """Endpoints must require X-Internal-Token or Bearer token."""
    payload = {
        "title": "Road crater",
        "description": "Deep pothole on main road",
        "category": "Road / Pothole",
        "candidates": []
    }

    # Missing token -> 401
    res_no_token = client.post("/internal/v1/analyze-complaint", json=payload)
    assert res_no_token.status_code == 401

    # Invalid token -> 401
    res_bad_token = client.post(
        "/internal/v1/analyze-complaint",
        json=payload,
        headers={"X-Internal-Token": "wrong_token_123"}
    )
    assert res_bad_token.status_code == 401

    # Valid token via X-Internal-Token -> 200
    res_valid = client.post(
        "/internal/v1/analyze-complaint",
        json=payload,
        headers={"X-Internal-Token": INTERNAL_TOKEN}
    )
    assert res_valid.status_code == 200

    # Valid token via Bearer header -> 200
    res_bearer = client.post(
        "/internal/v1/analyze-complaint",
        json=payload,
        headers={"Authorization": f"Bearer {INTERNAL_TOKEN}"}
    )
    assert res_bearer.status_code == 200


def test_input_validation():
    """Malformed or empty inputs must be rejected by Pydantic."""
    # Empty title
    res = client.post(
        "/internal/v1/analyze-complaint",
        json={"title": " ", "description": "some text", "category": "Road / Pothole"},
        headers=AUTH_HEADERS
    )
    assert res.status_code == 422

    # Coordinate out of range
    res_coord = client.post(
        "/internal/v1/analyze-complaint",
        json={
            "title": "Valid title",
            "description": "Valid description text",
            "category": "Road / Pothole",
            "latitude": 95.0,  # Invalid latitude (>90)
            "longitude": 77.0
        },
        headers=AUTH_HEADERS
    )
    assert res_coord.status_code == 422


def test_duplicate_nearby_similar_complaints():
    """Nearby reports with similar text should be ranked as high-probability candidates."""
    payload = {
        "title": "Deep crater pothole opposite Toit on 100ft road",
        "description": "Dangerous road crater pothole near 12th main Indiranagar causing vehicle skids",
        "category": "Road / Pothole",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "ward": "Indiranagar (Ward 112)",
        "candidates": [
            {
                "id": 84,
                "complaint_code": "CS-2026-00084",
                "title": "Huge pothole crater near 12th main Indiranagar 100ft road",
                "description": "Major road pothole right on arterial lane Indiranagar 100ft road.",
                "category": "Road / Pothole",
                "latitude": 12.9785,
                "longitude": 77.6409,
                "ward": "Indiranagar (Ward 112)"
            }
        ]
    }

    res = client.post("/internal/v1/duplicates/check", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["has_duplicates"] is True
    assert data["count"] == 1
    match = data["candidates"][0]
    assert match["complaint_id"] == 84
    assert match["text_similarity"] >= 0.30
    assert match["geographic_distance_meters"] is not None
    assert match["geographic_distance_meters"] <= 150  # ~15 meters apart
    assert match["composite_score"] >= 0.60
    assert "spatial proximity" in match["match_reason"].lower()


def test_duplicate_distant_complaints_penalized():
    """Reports with similar phrasing but far apart (>600m) must be penalized."""
    payload = {
        "title": "Deep crater pothole on main road",
        "description": "Tar completely broken on Indiranagar road",
        "category": "Road / Pothole",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "ward": "Indiranagar",
        "candidates": [
            {
                "id": 99,
                "title": "Deep crater pothole on main road",
                "description": "Tar completely broken on Whitefield road",
                "category": "Road / Pothole",
                "latitude": 12.9698,
                "longitude": 77.7500,  # ~12 km away!
                "ward": "Whitefield"
            }
        ]
    }

    res = client.post("/internal/v1/duplicates/check", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    # Distance is ~12km, composite score must be drastically reduced
    if data["candidates"]:
        match = data["candidates"][0]
        assert match["composite_score"] < 0.40
        assert any("exceeds 600m" in w.lower() for w in match["warnings"])


def test_duplicate_different_categories_ignored():
    """Different categories (e.g. garbage vs streetlight) at same coordinates should not match."""
    payload = {
        "title": "Dark street fixture at junction",
        "description": "Streetlight pole broken completely dark",
        "category": "Streetlight",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "candidates": [
            {
                "id": 105,
                "title": "Overflowing waste bin at junction",
                "description": "Garbage dump smelling bad near junction",
                "category": "Garbage / Waste",
                "latitude": 12.9784,
                "longitude": 77.6408
            }
        ]
    }

    res = client.post("/internal/v1/duplicates/check", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["has_duplicates"] is False
    assert data["count"] == 0


def test_duplicate_missing_coordinates_fallback():
    """Missing coordinates should fall back to textual + ward analysis with warning."""
    payload = {
        "title": "Water pipeline burst opposite temple",
        "description": "Huge drinking water pipeline burst flooding temple road",
        "category": "Water / Drainage",
        "latitude": None,
        "longitude": None,
        "ward": "Malleswaram",
        "candidates": [
            {
                "id": 115,
                "title": "Water pipe leak opposite temple",
                "description": "Drinking water pipeline leakage outside temple gate",
                "category": "Water / Drainage",
                "latitude": None,
                "longitude": None,
                "ward": "Malleswaram"
            }
        ]
    }

    res = client.post("/internal/v1/duplicates/check", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["has_duplicates"] is True
    match = data["candidates"][0]
    assert match["geographic_distance_meters"] is None
    assert any("coordinates unavailable" in w.lower() for w in match["warnings"])


def test_prioritization_critical_safety_hazard():
    """Safety hazard keywords must elevate priority to Critical with clear explanation."""
    payload = {
        "title": "Live electric wire sparking near school gate",
        "description": "Exposed live wire touching wet pavement. High risk of electrocution.",
        "category": "Streetlight",
        "location": "Near Carmel High School",
        "ward": "Basavanagudi"
    }

    res = client.post("/internal/v1/priority/evaluate", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    prio = res.json()
    assert prio["suggested_priority"] == "Critical"
    assert prio["priority_score"] >= 45
    assert any("live wire" in s.lower() or "electrocution" in s.lower() for s in prio["signals_used"])


def test_prioritization_corridor_multiplier():
    """Transit corridor keywords (e.g. 100ft road) should add density multiplier."""
    payload = {
        "title": "Clogged stormwater drain",
        "description": "Drain overflowing onto 100ft road Indiranagar slowing down traffic",
        "category": "Water / Drainage",
        "location": "100ft Road, Indiranagar",
        "ward": "Indiranagar (Ward 112)"
    }

    res = client.post("/internal/v1/priority/evaluate", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    prio = res.json()
    assert any("transit corridor" in s.lower() for s in prio["signals_used"])


def test_analyze_complaint_composite_workflow():
    """Test full /internal/v1/analyze-complaint composite endpoint."""
    payload = {
        "title": "Open manhole on 100ft road Indiranagar",
        "description": "Severe open manhole danger on 100ft road Indiranagar near metro pillar. Bikes falling.",
        "category": "Water / Drainage",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "ward": "Indiranagar (Ward 112)",
        "candidates": [
            {
                "id": 201,
                "title": "Open manhole near metro pillar on 100ft road",
                "description": "Missing manhole cover Indiranagar 100ft road dangerous hazard",
                "category": "Water / Drainage",
                "latitude": 12.9785,
                "longitude": 77.6409,
                "ward": "Indiranagar (Ward 112)"
            }
        ]
    }

    res = client.post("/internal/v1/analyze-complaint", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["has_duplicate_candidates"] is True
    assert data["candidate_count"] == 1
    assert data["priority_recommendation"]["suggested_priority"] == "Critical"
    assert "analysis_timestamp" in data
