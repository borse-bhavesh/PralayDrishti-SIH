from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from app.decision.engine import run_decision_analysis
from app.simulation.engine import VALID_SCENARIOS

router = APIRouter(prefix="/decision", tags=["decision"])

class DecisionRequest(BaseModel):
    rainfall_intensity_mm_hr: float = Field(..., gt=0, le=300)
    duration_minutes: int = Field(..., ge=30, le=360)
    drainage_condition: float = Field(default=0.7, ge=0.0, le=1.0)
    scenario: str = Field(default="normal")
    time_minutes: int = Field(..., ge=0, le=180)

@router.post("/analyze")
async def analyze_decision(req: DecisionRequest):
    """
    Run the decision intelligence analysis for a specific time step.
    """
    if req.scenario not in VALID_SCENARIOS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid scenario '{req.scenario}'. Must be one of: {VALID_SCENARIOS}",
        )
        
    try:
        result = run_decision_analysis(
            rainfall_intensity_mm_hr=req.rainfall_intensity_mm_hr,
            duration_minutes=req.duration_minutes,
            drainage_condition=req.drainage_condition,
            scenario=req.scenario,
            time_minutes=req.time_minutes
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decision engine error: {e}")
