"""
PralayDrishti — Simulation Engine Tests

Run with:
    cd backend
    python test_simulation.py

These tests verify the simplified flood simulation engine
against all requirements specified in the project specification.
"""
import sys
import json
from pathlib import Path

# Ensure the backend root is on the path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.simulation.engine import (
    run_simulation,
    classify_risk,
    RISK_THRESHOLDS,
    TIME_STEPS,
    VALID_SCENARIOS,
    SCENARIO_FACTORS,
)

PASS = 0
FAIL = 0


def check(name: str, condition: bool, detail: str = ""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        msg = f"  ❌ {name}"
        if detail:
            msg += f" — {detail}"
        print(msg)


def test_risk_classification():
    print("\n── Risk Classification ──")
    check("depth 0.0 → low", classify_risk(0.0) == "low")
    check("depth 0.05 → low", classify_risk(0.05) == "low")
    check("depth 0.09 → low", classify_risk(0.09) == "low")
    check("depth 0.10 → moderate", classify_risk(0.10) == "moderate")
    check("depth 0.15 → moderate", classify_risk(0.15) == "moderate")
    check("depth 0.24 → moderate", classify_risk(0.24) == "moderate")
    check("depth 0.25 → high", classify_risk(0.25) == "high")
    check("depth 0.35 → high", classify_risk(0.35) == "high")
    check("depth 0.49 → high", classify_risk(0.49) == "high")
    check("depth 0.50 → severe", classify_risk(0.50) == "severe")
    check("depth 1.00 → severe", classify_risk(1.00) == "severe")


def test_time_steps():
    print("\n── Time Steps ──")
    check("TIME_STEPS is [0,30,60,90,120,150,180]",
          TIME_STEPS == [0, 30, 60, 90, 120, 150, 180])


def test_basic_simulation():
    print("\n── Basic Simulation (normal, 50 mm/hr, 180 min) ──")
    result = run_simulation(
        rainfall_intensity_mm_hr=50,
        duration_minutes=180,
        drainage_condition=0.7,
        scenario="normal",
    )

    check("status is 'simulated'", result["status"] == "simulated")
    check("scenario is 'normal'", result["scenario"] == "normal")
    check("time_steps present", result["time_steps"] == TIME_STEPS)
    check("risk_thresholds_m present", result["risk_thresholds_m"] == RISK_THRESHOLDS)
    check("roads is a list", isinstance(result["roads"], list))
    check("at least 1 road", len(result["roads"]) > 0)
    check("disclaimer present", "simulated" in result.get("disclaimer", "").lower()
          or "SIMULATED" in result.get("disclaimer", ""))

    # Every road must have all 7 time steps
    for road in result["roads"]:
        ts = [r["time_minutes"] for r in road["results"]]
        check(f"  {road['name']}: has all 7 time steps",
              ts == TIME_STEPS,
              f"got {ts}")

        # Check that each result has the required keys
        for r in road["results"]:
            keys = set(r.keys())
            required = {"time_minutes", "water_depth_m", "risk_level", "arrival_time_minutes"}
            check(f"  {road['name']} t={r['time_minutes']}: has required keys",
                  required.issubset(keys),
                  f"missing {required - keys}")


def test_roads_have_different_depths():
    print("\n── Road Depth Variation ──")
    result = run_simulation(
        rainfall_intensity_mm_hr=80,
        duration_minutes=180,
        drainage_condition=0.7,
        scenario="normal",
    )

    # Collect max depths for each road
    max_depths = []
    for road in result["roads"]:
        md = max(r["water_depth_m"] for r in road["results"])
        max_depths.append((road["name"], md))

    # Not all roads should have the same max depth
    unique_depths = set(d for _, d in max_depths)
    check("Roads have different max depths",
          len(unique_depths) > 1,
          f"unique depths: {unique_depths}")

    for name, d in max_depths:
        print(f"    {name}: max depth = {d:.3f} m")


def test_depth_increases_over_time():
    print("\n── Depth Increases Over Time ──")
    result = run_simulation(
        rainfall_intensity_mm_hr=80,
        duration_minutes=180,
        drainage_condition=0.7,
        scenario="normal",
    )

    for road in result["roads"]:
        depths = [r["water_depth_m"] for r in road["results"]]
        # Depth at t=0 should be 0
        check(f"  {road['name']}: depth at t=0 is 0",
              depths[0] == 0.0,
              f"got {depths[0]}")
        # Depth should generally increase (allow equal for adjacent steps)
        non_decreasing = all(depths[i] <= depths[i+1] for i in range(len(depths)-1))
        check(f"  {road['name']}: depth non-decreasing over time",
              non_decreasing,
              f"depths: {depths}")


def test_scenario_ordering():
    print("\n── Scenario Ordering ──")
    results = {}
    for scen in ["normal", "blocked_drain", "pump_failure", "extreme_rainfall"]:
        results[scen] = run_simulation(
            rainfall_intensity_mm_hr=80,
            duration_minutes=180,
            drainage_condition=0.7,
            scenario=scen,
        )

    # For every road, compare max depth across scenarios
    num_roads = len(results["normal"]["roads"])
    for i in range(num_roads):
        name = results["normal"]["roads"][i]["name"]
        depths = {}
        for scen in results:
            md = max(r["water_depth_m"] for r in results[scen]["roads"][i]["results"])
            depths[scen] = md

        check(f"  {name}: blocked_drain > normal",
              depths["blocked_drain"] > depths["normal"],
              f"blocked={depths['blocked_drain']:.3f}, normal={depths['normal']:.3f}")

        check(f"  {name}: pump_failure > normal",
              depths["pump_failure"] > depths["normal"],
              f"pump={depths['pump_failure']:.3f}, normal={depths['normal']:.3f}")

        check(f"  {name}: extreme_rainfall is greatest",
              depths["extreme_rainfall"] >= max(depths["blocked_drain"], depths["pump_failure"]),
              f"extreme={depths['extreme_rainfall']:.3f}")


def test_higher_intensity_more_depth():
    print("\n── Higher Intensity → More Depth ──")
    r_low = run_simulation(
        rainfall_intensity_mm_hr=30,
        duration_minutes=180,
        drainage_condition=0.7,
        scenario="normal",
    )
    r_high = run_simulation(
        rainfall_intensity_mm_hr=100,
        duration_minutes=180,
        drainage_condition=0.7,
        scenario="normal",
    )

    for i in range(len(r_low["roads"])):
        name = r_low["roads"][i]["name"]
        max_low = max(r["water_depth_m"] for r in r_low["roads"][i]["results"])
        max_high = max(r["water_depth_m"] for r in r_high["roads"][i]["results"])
        check(f"  {name}: 100mm/hr > 30mm/hr",
              max_high > max_low,
              f"high={max_high:.3f}, low={max_low:.3f}")


def test_arrival_time():
    print("\n── Arrival Time ──")
    result = run_simulation(
        rainfall_intensity_mm_hr=100,
        duration_minutes=180,
        drainage_condition=0.7,
        scenario="extreme_rainfall",
    )

    for road in result["roads"]:
        results = road["results"]
        arrival = results[-1]["arrival_time_minutes"]

        # Find first step where risk >= moderate
        first_moderate = None
        for r in results:
            if r["risk_level"] in ("moderate", "high", "severe"):
                first_moderate = r["time_minutes"]
                break

        if first_moderate is not None:
            check(f"  {road['name']}: arrival={arrival} matches first moderate step={first_moderate}",
                  arrival == first_moderate)
        else:
            check(f"  {road['name']}: arrival is null (never reached moderate)",
                  arrival is None)


def test_risk_matches_thresholds():
    print("\n── Risk Levels Match Centralized Thresholds ──")
    result = run_simulation(
        rainfall_intensity_mm_hr=80,
        duration_minutes=180,
        drainage_condition=0.7,
        scenario="normal",
    )

    for road in result["roads"]:
        for r in road["results"]:
            expected = classify_risk(r["water_depth_m"])
            check(f"  {road['name']} t={r['time_minutes']}: risk='{r['risk_level']}' matches depth={r['water_depth_m']}",
                  r["risk_level"] == expected,
                  f"expected '{expected}', got '{r['risk_level']}'")


def test_invalid_scenario():
    print("\n── Invalid Scenario ──")
    try:
        run_simulation(
            rainfall_intensity_mm_hr=50,
            duration_minutes=180,
            drainage_condition=0.7,
            scenario="tornado",
        )
        check("invalid scenario raises error", False, "no error raised")
    except ValueError as e:
        check("invalid scenario raises ValueError", True)


# ── Run all tests ────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("PralayDrishti Simulation Tests")
    print("=" * 60)

    test_risk_classification()
    test_time_steps()
    test_basic_simulation()
    test_roads_have_different_depths()
    test_depth_increases_over_time()
    test_scenario_ordering()
    test_higher_intensity_more_depth()
    test_arrival_time()
    test_risk_matches_thresholds()
    test_invalid_scenario()

    print("\n" + "=" * 60)
    print(f"Results: {PASS} passed, {FAIL} failed")
    print("=" * 60)

    sys.exit(1 if FAIL > 0 else 0)
