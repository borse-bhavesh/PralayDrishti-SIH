from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Tuple

from app.simulation.engine import run_simulation, TIME_STEPS
from app.routing.graph import get_road_graph, dijkstra_route

router = APIRouter(
    prefix="/api/routing",
    tags=["Routing"],
)

class RouteRequest(BaseModel):
    start_road_id: str
    end_road_id: str
    time_minutes: int
    routing_mode: str
    rainfall_intensity_mm_hr: float
    duration_minutes: int
    scenario: str
    drainage_condition: float

class CompareRequest(BaseModel):
    start_road_id: str
    end_road_id: str
    time_minutes: int
    routing_mode: str
    rainfall_intensity_mm_hr: float
    duration_minutes: int
    scenario_a: str
    scenario_b: str
    drainage_condition: float

def _get_road_details(sim_result: dict, time_minutes: int) -> Dict[str, dict]:
    road_details = {}
    for road in sim_result.get("roads", []):
        road_id = road["road_id"]
        detail = {"risk": "low", "depth": 0.0}
        for result in road.get("results", []):
            if result["time_minutes"] == time_minutes:
                detail["risk"] = result["risk_level"]
                detail["depth"] = result["water_depth_m"]
                break
        road_details[road_id] = detail
    return road_details

def _build_route_geometry(graph, path: List[str]) -> Optional[dict]:
    if not path:
        return None
    
    features = []
    for road_id in path:
        if road_id in graph.edges:
            edge = graph.edges[road_id]
            # Get original geometry from the geojson
            import json
            from app.config import settings
            roads_path = settings.DATA_DIR / "roads.geojson"
            with open(roads_path, "r", encoding="utf-8") as f:
                collection = json.load(f)
            
            for feature in collection.get("features", []):
                props = feature.get("properties", {})
                name = props.get("name", "")
                feat_id = "road_" + name.lower().replace(" ", "_").replace("–", "_").replace("/", "_")[:40] if name else ""
                if feat_id == road_id:
                    features.append({
                        "type": "Feature",
                        "properties": {"road_id": road_id, "name": name},
                        "geometry": feature.get("geometry")
                    })
                    break
    
    return {
        "type": "FeatureCollection",
        "features": features
    }

def _calculate_metrics(path: List[str], road_details: Dict[str, dict]) -> Tuple[float, List[str]]:
    max_depth = 0.0
    high_risk_included = []
    for road_id in path:
        detail = road_details.get(road_id, {"risk": "low", "depth": 0.0})
        max_depth = max(max_depth, detail["depth"])
        if detail["risk"] in ("high", "severe"):
            high_risk_included.append(road_id)
    return max_depth, high_risk_included

@router.post("/route")
def calculate_route(request: RouteRequest):
    if request.time_minutes not in TIME_STEPS:
        raise HTTPException(status_code=422, detail=f"Unsupported time_minutes. Must be one of {TIME_STEPS}")
    
    if request.routing_mode not in ("shortest", "safest", "emergency"):
        raise HTTPException(status_code=422, detail="Invalid routing mode.")

    try:
        sim_result = run_simulation(
            rainfall_intensity_mm_hr=request.rainfall_intensity_mm_hr,
            duration_minutes=request.duration_minutes,
            drainage_condition=request.drainage_condition,
            scenario=request.scenario,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    road_details = _get_road_details(sim_result, request.time_minutes)
    road_risks = {k: v["risk"] for k, v in road_details.items()}

    graph = get_road_graph()
    
    if request.start_road_id not in graph.edges:
        raise HTTPException(status_code=422, detail=f"Unknown start road: {request.start_road_id}")
    if request.end_road_id not in graph.edges:
        raise HTTPException(status_code=422, detail=f"Unknown end road: {request.end_road_id}")
    if request.start_road_id == request.end_road_id:
        raise HTTPException(status_code=422, detail="Start and end road cannot be the same.")

    route_found, path, cost, dist, max_risk, warnings = dijkstra_route(
        graph, request.start_road_id, request.end_road_id, request.routing_mode, road_risks
    )
    
    geometry = _build_route_geometry(graph, path) if route_found else None
    max_depth, high_risk_included = _calculate_metrics(path, road_details)
    
    high_risk_avoided = []
    if request.routing_mode == "safest" and route_found:
        # Calculate shortest path in background to find avoided roads
        s_found, s_path, _, _, _, _ = dijkstra_route(graph, request.start_road_id, request.end_road_id, "shortest", road_risks)
        if s_found:
            _, s_high_included = _calculate_metrics(s_path, road_details)
            # Avoided = (high risk in shortest) - (high risk in safest)
            high_risk_avoided = list(set(s_high_included) - set(high_risk_included))

    is_emergency_suitable = False
    if request.routing_mode == "emergency" and route_found and max_risk not in ("high", "severe"):
        is_emergency_suitable = True

    return {
        "status": "simulated",
        "routing_mode": request.routing_mode,
        "time_minutes": request.time_minutes,
        "start_road_id": request.start_road_id,
        "end_road_id": request.end_road_id,
        "route_found": route_found,
        "route_road_ids": path,
        "route_geometry": geometry,
        "route_segment_count": len(path),
        "estimated_distance_m": round(dist, 1),
        "total_cost": round(cost, 1),
        "maximum_risk_level": max_risk,
        "maximum_water_depth_m": max_depth,
        "high_risk_roads_included": high_risk_included,
        "high_risk_roads_avoided": high_risk_avoided,
        "warnings": warnings,
        "is_emergency_suitable": is_emergency_suitable
    }


@router.post("/compare")
def compare_scenarios(request: CompareRequest):
    if request.time_minutes not in TIME_STEPS:
        raise HTTPException(status_code=422, detail=f"Unsupported time_minutes. Must be one of {TIME_STEPS}")
    
    if request.routing_mode not in ("shortest", "safest", "emergency"):
        raise HTTPException(status_code=422, detail="Invalid routing mode.")

    graph = get_road_graph()
    if request.start_road_id not in graph.edges or request.end_road_id not in graph.edges:
        raise HTTPException(status_code=422, detail="Unknown start or end road.")
    if request.start_road_id == request.end_road_id:
        raise HTTPException(status_code=422, detail="Start and end road cannot be the same.")

    # Scenario A
    try:
        sim_a = run_simulation(
            rainfall_intensity_mm_hr=request.rainfall_intensity_mm_hr,
            duration_minutes=request.duration_minutes,
            drainage_condition=request.drainage_condition,
            scenario=request.scenario_a,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Scenario A error: {str(e)}")

    details_a = _get_road_details(sim_a, request.time_minutes)
    risks_a = {k: v["risk"] for k, v in details_a.items()}
    found_a, path_a, _, dist_a, max_risk_a, warns_a = dijkstra_route(
        graph, request.start_road_id, request.end_road_id, request.routing_mode, risks_a
    )
    geom_a = _build_route_geometry(graph, path_a) if found_a else None
    max_depth_a, high_inc_a = _calculate_metrics(path_a, details_a)

    # Scenario B
    try:
        sim_b = run_simulation(
            rainfall_intensity_mm_hr=request.rainfall_intensity_mm_hr,
            duration_minutes=request.duration_minutes,
            drainage_condition=request.drainage_condition,
            scenario=request.scenario_b,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Scenario B error: {str(e)}")

    details_b = _get_road_details(sim_b, request.time_minutes)
    risks_b = {k: v["risk"] for k, v in details_b.items()}
    found_b, path_b, _, dist_b, max_risk_b, warns_b = dijkstra_route(
        graph, request.start_road_id, request.end_road_id, request.routing_mode, risks_b
    )
    geom_b = _build_route_geometry(graph, path_b) if found_b else None
    max_depth_b, high_inc_b = _calculate_metrics(path_b, details_b)

    path_a_set = set(path_a)
    path_b_set = set(path_b)
    route_changed = path_a != path_b
    added_roads = list(path_b_set - path_a_set)
    removed_roads = list(path_a_set - path_b_set)

    warnings = []
    if warns_a:
        warnings.append(f"{request.scenario_a.capitalize()}: {warns_a[0]}")
    if warns_b:
        warnings.append(f"{request.scenario_b.capitalize()}: {warns_b[0]}")

    return {
        "status": "simulated",
        "scenario_a": {
            "scenario": request.scenario_a,
            "route_found": found_a,
            "route_road_ids": path_a,
            "route_geometry": geom_a,
            "route_segment_count": len(path_a),
            "estimated_distance_m": round(dist_a, 1),
            "maximum_risk_level": max_risk_a,
            "maximum_water_depth_m": max_depth_a,
            "high_risk_roads_included": high_inc_a,
            "high_risk_roads_avoided": []
        },
        "scenario_b": {
            "scenario": request.scenario_b,
            "route_found": found_b,
            "route_road_ids": path_b,
            "route_geometry": geom_b,
            "route_segment_count": len(path_b),
            "estimated_distance_m": round(dist_b, 1),
            "maximum_risk_level": max_risk_b,
            "maximum_water_depth_m": max_depth_b,
            "high_risk_roads_included": high_inc_b,
            "high_risk_roads_avoided": []
        },
        "route_changed": route_changed,
        "added_roads": added_roads,
        "removed_roads": removed_roads,
        "warnings": warnings
    }
