"""
PralayDrishti — Simplified Flood Simulation Engine

IMPORTANT: This is a simplified, illustrative prototype model.
It is NOT a production hydraulic solver (e.g., SWMM, HEC-RAS).
All outputs are labeled as "simulated" and should be treated
as scenario-based approximations for demonstration purposes only.

The model applies a deterministic formula that varies water depth
by road-specific characteristics, rainfall parameters, drainage
condition, and scenario type.  It is designed to show *relative*
differences between roads and scenarios, not absolute predictions.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Optional

from app.config import settings

# ────────────────────────────────────────────────────────────────────
# 1. CENTRALIZED RISK THRESHOLDS (meters of water depth)
#    These are the SINGLE source of truth for the whole application.
# ────────────────────────────────────────────────────────────────────
RISK_THRESHOLDS = {
    "low": 0.10,       # below 0.10 m → low
    "moderate": 0.25,  # 0.10 – 0.25 m → moderate
    "high": 0.50,      # 0.25 – 0.50 m → high
    # >= 0.50 m → severe
}

# Canonical time steps used everywhere (minutes)
TIME_STEPS = [0, 30, 60, 90, 120, 150, 180]


def classify_risk(depth_m: float) -> str:
    """Classify water depth into a risk level using centralized thresholds."""
    if depth_m < RISK_THRESHOLDS["low"]:
        return "low"
    elif depth_m < RISK_THRESHOLDS["moderate"]:
        return "moderate"
    elif depth_m < RISK_THRESHOLDS["high"]:
        return "high"
    else:
        return "severe"


# ────────────────────────────────────────────────────────────────────
# 2. SCENARIO MULTIPLIERS
#    Each scenario modifies the effective rainfall reaching the road.
# ────────────────────────────────────────────────────────────────────
SCENARIO_FACTORS: dict[str, float] = {
    "normal":           1.0,
    "blocked_drain":    1.45,   # drains partially blocked → slower runoff
    "pump_failure":     1.35,   # pump stations offline → slower drainage
    "extreme_rainfall": 1.70,   # extreme event amplification
}

VALID_SCENARIOS = list(SCENARIO_FACTORS.keys())

# ────────────────────────────────────────────────────────────────────
# 3. ROAD-SPECIFIC DEFAULT PROPERTIES
#    When a property is missing from the GeoJSON, use these defaults.
#    Documented here so users know what assumptions are made.
# ────────────────────────────────────────────────────────────────────
ROAD_DEFAULTS = {
    "elevation_m":        8.0,    # meters above sea level
    "drainage_capacity":  0.6,    # 0–1, fraction of ideal capacity
    "imperviousness":     0.85,   # 0–1, fraction impervious surface
}

# Map the GeoJSON "flood_risk" text values to a numeric vulnerability
# score that modulates water accumulation.
FLOOD_RISK_VULNERABILITY: dict[str, float] = {
    "high":   1.30,
    "medium": 1.00,
    "low":    0.70,
}

# Map road "type" to a base infiltration modifier.  Highways are wider
# and drain slightly faster; arterials accumulate more.
ROAD_TYPE_MODIFIER: dict[str, float] = {
    "highway":  0.90,
    "arterial": 1.10,
}

# ────────────────────────────────────────────────────────────────────
# 4. LOAD ROADS FROM LOCAL GEOJSON
# ────────────────────────────────────────────────────────────────────

def _load_roads() -> list[dict]:
    """Load road features from the local GeoJSON file."""
    roads_path: Path = settings.DATA_DIR / "roads.geojson"
    if not roads_path.exists():
        raise FileNotFoundError(f"roads.geojson not found at {roads_path}")

    with open(roads_path, "r", encoding="utf-8") as f:
        collection = json.load(f)

    return collection.get("features", [])


def _road_id(feature: dict, index: int) -> str:
    """Generate a stable road ID from feature properties or index."""
    props = feature.get("properties", {})
    name = props.get("name", "")
    if name:
        return "road_" + name.lower().replace(" ", "_").replace("–", "_").replace("/", "_")[:40]
    return f"road_{index:03d}"


# ────────────────────────────────────────────────────────────────────
# 5. CORE SIMULATION FUNCTION
# ────────────────────────────────────────────────────────────────────

def run_simulation(
    rainfall_intensity_mm_hr: float,
    duration_minutes: int,
    drainage_condition: float,
    scenario: str,
) -> dict:
    """
    Run a simplified flood simulation.

    Parameters
    ----------
    rainfall_intensity_mm_hr : float
        Rainfall intensity in mm/hr (1–300).
    duration_minutes : int
        Duration of rainfall in minutes (30–360).
    drainage_condition : float
        Overall drainage system efficiency 0.0 (fully blocked) to 1.0 (optimal).
    scenario : str
        One of: normal, blocked_drain, pump_failure, extreme_rainfall.

    Returns
    -------
    dict
        Complete simulation response with time-series data per road.

    Model Overview (Simplified)
    ---------------------------
    For each road at each time step t (minutes):

        effective_rain = intensity * scenario_factor * vulnerability
        accumulation   = effective_rain * (t / 60) * imperviousness / 1000
        drainage_loss  = drainage_capacity * drainage_condition * (t / 60) * base_drain_rate
        depth          = max(0, accumulation - drainage_loss)

    The formula ensures:
    - Higher intensity → deeper water
    - Longer time → deeper water (monotonically increasing within active rain)
    - blocked_drain / pump_failure / extreme_rainfall → deeper than normal
    - Each road gets different depth based on its properties
    """

    if scenario not in SCENARIO_FACTORS:
        raise ValueError(f"Unknown scenario '{scenario}'. Must be one of {VALID_SCENARIOS}")

    scenario_factor = SCENARIO_FACTORS[scenario]
    features = _load_roads()

    roads_results: list[dict] = []

    for idx, feature in enumerate(features):
        props = feature.get("properties", {})
        road_name = props.get("name", f"Road {idx + 1}")
        rid = _road_id(feature, idx)

        # ── Extract or default road-specific properties ──────────
        elevation    = props.get("elevation_m",       ROAD_DEFAULTS["elevation_m"])
        drain_cap    = props.get("drainage_capacity", ROAD_DEFAULTS["drainage_capacity"])
        imperv       = props.get("imperviousness",    ROAD_DEFAULTS["imperviousness"])

        flood_risk_text = props.get("flood_risk", "medium")
        vulnerability   = FLOOD_RISK_VULNERABILITY.get(flood_risk_text, 1.0)

        road_type = props.get("type", "arterial")
        type_mod  = ROAD_TYPE_MODIFIER.get(road_type, 1.0)

        # ── Elevation modifier: lower roads accumulate more ──────
        # Normalise around 8 m ASL; each meter lower adds ~5% depth
        elevation_mod = 1.0 + (ROAD_DEFAULTS["elevation_m"] - elevation) * 0.05
        elevation_mod = max(0.5, min(elevation_mod, 1.5))

        # ── Base drainage rate (meters drained per hour) ─────────
        # A well-functioning drain can remove ~0.08 m/hr of standing water.
        base_drain_rate = 0.08

        # ── Per-road effective parameters ────────────────────────
        effective_rain = rainfall_intensity_mm_hr * scenario_factor * vulnerability * type_mod * elevation_mod

        time_results: list[dict] = []
        arrival_time: Optional[int] = None

        for t in TIME_STEPS:
            if t == 0:
                # At t=0 no rain has fallen yet
                depth = 0.0
            else:
                hours = t / 60.0
                # Water accumulated (mm → m)
                accumulation = effective_rain * hours * imperv / 1000.0

                # Drainage removed (increases over time but slower than accumulation
                # when rain is heavy)
                drain_removed = drain_cap * drainage_condition * hours * base_drain_rate

                # Apply a gentle non-linear growth (sqrt) to avoid perfectly
                # linear lines and make the curves feel more realistic.
                depth = max(0.0, accumulation * math.sqrt(hours) - drain_removed)

            # Round to 3 decimal places for readability
            depth = round(depth, 3)

            risk = classify_risk(depth)

            # arrival_time = first time step reaching moderate or higher
            if arrival_time is None and risk in ("moderate", "high", "severe"):
                arrival_time = t

            time_results.append({
                "time_minutes": t,
                "water_depth_m": depth,
                "risk_level": risk,
                "arrival_time_minutes": arrival_time,
            })

        roads_results.append({
            "road_id": rid,
            "name": road_name,
            "results": time_results,
        })

    return {
        "status": "simulated",
        "scenario": scenario,
        "rainfall_intensity_mm_hr": rainfall_intensity_mm_hr,
        "duration_minutes": duration_minutes,
        "drainage_condition": drainage_condition,
        "time_steps": TIME_STEPS,
        "risk_thresholds_m": RISK_THRESHOLDS,
        "roads": roads_results,
        "disclaimer": (
            "These results are SIMULATED using a simplified illustrative model. "
            "They do not represent actual hydraulic predictions and should not "
            "be used for real emergency decision-making."
        ),
    }
