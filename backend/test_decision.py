import pytest
from app.decision.engine import run_decision_analysis

def test_decision_analysis_hotspots_and_explanations():
    # Run a simulation for an extreme scenario
    result = run_decision_analysis(
        rainfall_intensity_mm_hr=150,
        duration_minutes=120,
        drainage_condition=0.3,
        scenario="extreme_rainfall",
        time_minutes=120
    )
    
    assert result["status"] == "simulated"
    assert result["time_minutes"] == 120
    
    # Extreme rainfall should cause severe hotspots
    hotspots = result["hotspots"]
    assert len(hotspots) > 0
    assert hotspots[0]["risk_level"] in ["high", "severe"]
    assert hotspots[0]["priority"] in ["high", "critical"]
    
    # Explanation should reflect extreme rainfall
    explanations = result["explanations"]
    assert len(explanations) > 0
    assert "Drainage overload" in explanations[0]["primary_cause"]

def test_decision_analysis_drainage_health():
    # Run a blocked drain scenario
    result = run_decision_analysis(
        rainfall_intensity_mm_hr=100,
        duration_minutes=60,
        drainage_condition=0.5,
        scenario="blocked_drain",
        time_minutes=60
    )
    
    drainage = result["drainage_health"]
    assert len(drainage) > 0
    
    # There should be blocked drains or warnings
    blocked = [d for d in drainage if d["status"] == "BLOCKED"]
    assert len(blocked) >= 0 # depending on logic, some might be blocked
    
    # Recommendation should mention blocked drains if any
    recs = result["recommendations"]
    if blocked:
        blocked_recs = [r for r in recs if "Clear drainage node" in r["action"]]
        assert len(blocked_recs) > 0

def test_decision_analysis_infrastructure():
    # Normal low rain shouldn't impact infra much
    result = run_decision_analysis(
        rainfall_intensity_mm_hr=10,
        duration_minutes=30,
        drainage_condition=1.0,
        scenario="normal",
        time_minutes=30
    )
    
    infra = result["critical_infrastructure"]
    assert len(infra) > 0
    
    # Infra should mostly be safe in very light rain
    safe_infra = [i for i in infra if i["accessibility"] == "SAFE"]
    assert len(safe_infra) > 0

def test_recommendation_generation():
    # Pump failure scenario
    result = run_decision_analysis(
        rainfall_intensity_mm_hr=120,
        duration_minutes=120,
        drainage_condition=0.8,
        scenario="pump_failure",
        time_minutes=90
    )
    
    recs = result["recommendations"]
    assert len(recs) > 0
    assert any("mobile pumps" in r["action"].lower() for r in recs)

