"""
Simulation Router — POST /api/simulation/run

Accepts rainfall parameters and scenario, returns time-series
simulated flood data for each road segment.
"""
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from app.simulation.engine import (
    run_simulation,
    VALID_SCENARIOS,
    TIME_STEPS,
    RISK_THRESHOLDS,
)

router = APIRouter(prefix="/simulation", tags=["simulation"])


# ── Request schema ───────────────────────────────────────────────────
class SimulationRequest(BaseModel):
    rainfall_intensity_mm_hr: float = Field(
        ...,
        gt=0,
        le=300,
        description="Rainfall intensity in mm/hr (1–300)",
    )
    duration_minutes: int = Field(
        ...,
        ge=30,
        le=360,
        description="Duration of rainfall in minutes (30–360)",
    )
    drainage_condition: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Drainage system efficiency: 0.0 (fully blocked) to 1.0 (optimal)",
    )
    scenario: str = Field(
        default="normal",
        description=f"Scenario type. One of: {', '.join(VALID_SCENARIOS)}",
    )


# ── Endpoint ─────────────────────────────────────────────────────────
@router.post("/run")
async def run_sim(req: SimulationRequest):
    """
    Run a simplified flood simulation.

    Returns time-series water depth and risk levels for each road
    at the canonical time steps: 0, 30, 60, 90, 120, 150, 180 minutes.

    NOTE: Results are SIMULATED and illustrative only.
    """
    if req.scenario not in VALID_SCENARIOS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid scenario '{req.scenario}'. Must be one of: {VALID_SCENARIOS}",
        )

    try:
        result = run_simulation(
            rainfall_intensity_mm_hr=req.rainfall_intensity_mm_hr,
            duration_minutes=req.duration_minutes,
            drainage_condition=req.drainage_condition,
            scenario=req.scenario,
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {e}")


# ── Metadata endpoints (optional helpers) ────────────────────────────
@router.get("/scenarios")
async def list_scenarios():
    """Return the list of supported scenarios."""
    return {"scenarios": VALID_SCENARIOS}


@router.get("/config")
async def get_config():
    """Return the simulation configuration (time steps, thresholds)."""
    return {
        "time_steps": TIME_STEPS,
        "risk_thresholds_m": RISK_THRESHOLDS,
        "valid_scenarios": VALID_SCENARIOS,
    }
