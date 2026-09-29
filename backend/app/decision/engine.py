import json
import math
from typing import Dict, List

from app.config import settings
from app.simulation.engine import run_simulation, RISK_THRESHOLDS

def _load_geojson(filename: str) -> List[Dict]:
    path = settings.DATA_DIR / filename
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        collection = json.load(f)
    return collection.get("features", [])

def _calculate_distance(coord1, coord2):
    """Calculate an approximate distance in meters between two lon/lat coordinates."""
    # Rough approximation: 1 degree latitude ~ 111km
    lat1, lon1 = coord1[1], coord1[0]
    lat2, lon2 = coord2[1], coord2[0]
    dx = (lon2 - lon1) * 40000 * math.cos((lat1 + lat2) * math.pi / 360) / 360
    dy = (lat2 - lat1) * 40000 / 360
    return math.sqrt(dx * dx + dy * dy) * 1000

def _get_road_midpoint(feature):
    coords = feature["geometry"]["coordinates"]
    if feature["geometry"]["type"] == "LineString":
        mid = coords[len(coords) // 2]
        return mid
    elif feature["geometry"]["type"] == "MultiLineString":
        mid = coords[0][len(coords[0]) // 2]
        return mid
    return [0, 0]

def analyze_hotspots(simulation_result: Dict, time_minutes: int, critical_infra: List[Dict]) -> List[Dict]:
    roads = simulation_result.get("roads", [])
    
    # Load road features to get coordinates for infra matching
    road_features = _load_geojson("roads.geojson")
    road_map = {}
    for idx, f in enumerate(road_features):
        props = f.get("properties", {})
        name = props.get("name", "")
        if name:
            rid = "road_" + name.lower().replace(" ", "_").replace("–", "_").replace("/", "_")[:40]
        else:
            rid = f"road_{idx:03d}"
        road_map[rid] = f
        
    hotspots = []
    
    risk_weights = {"low": 10, "moderate": 30, "high": 70, "severe": 100}
    
    for road in roads:
        step = next((r for r in road["results"] if r["time_minutes"] == time_minutes), None)
        if not step:
            continue
            
        depth = step["water_depth_m"]
        if depth < 0.1:
            continue # not a hotspot
            
        risk_level = step["risk_level"]
        arrival = step["arrival_time_minutes"] or 180
        
        # Base scores
        risk_score = risk_weights.get(risk_level, 0)
        depth_score = min(depth * 50, 50) # up to 50 points for 1m depth
        urgency_score = max(0, (180 - arrival) / 180 * 30) # up to 30 points for early arrival
        
        # Check infra impact
        infra_score = 0
        road_feature = road_map.get(road["road_id"])
        if road_feature:
            rmid = _get_road_midpoint(road_feature)
            for infra in critical_infra:
                icoord = infra["geometry"]["coordinates"]
                dist = _calculate_distance(rmid, icoord)
                if dist < 200: # within 200m
                    infra_score += 20
        
        total_score = risk_score + depth_score + urgency_score + infra_score
        
        if total_score > 60:
            priority = "critical" if total_score > 120 else "high" if total_score > 90 else "medium"
            hotspots.append({
                "road_id": road["road_id"],
                "road_name": road["name"],
                "risk_level": risk_level,
                "water_depth_m": depth,
                "arrival_time_minutes": arrival,
                "priority": priority,
                "priority_score": int(total_score)
            })
            
    # Sort by priority score desc
    hotspots.sort(key=lambda x: x["priority_score"], reverse=True)
    return hotspots[:10] # Top 10

def explain_causes(scenario: str, intensity: float, condition: float) -> Dict:
    causes = []
    primary = "Heavy rainfall"
    if scenario == "blocked_drain":
        primary = "Drain blockage"
        causes.extend(["Reduced drainage capacity", "Solid waste obstruction"])
    elif scenario == "pump_failure":
        primary = "Pump failure"
        causes.extend(["Mechanical failure at pump station", "Inability to discharge water"])
    elif scenario == "extreme_rainfall" or intensity > 100:
        primary = "Drainage overload"
        causes.extend(["Extreme rainfall intensity exceeding design capacity"])
        
    if condition < 0.5:
        causes.append("Poor overall drainage maintenance")
        
    return {
        "primary_cause": primary,
        "contributing_factors": causes if causes else ["High surface runoff"],
        "confidence": "Prototype / illustrative"
    }

def analyze_drainage(scenario: str, condition: float, intensity: float) -> List[Dict]:
    nodes = _load_geojson("drainage_nodes.geojson")
    results = []
    for node in nodes:
        props = node.get("properties", {})
        
        base_utilization = min(1.0, (intensity / 150))
        if scenario == "blocked_drain":
            base_utilization *= 1.4
        elif scenario == "pump_failure" and props.get("type") == "pump_station":
            base_utilization *= 1.8
        elif scenario == "extreme_rainfall":
            base_utilization *= 1.6
            
        # condition factor
        utilization = base_utilization * (2.0 - condition)
        util_pct = min(100, int(utilization * 100))
        
        if scenario == "pump_failure" and props.get("type") == "pump_station":
            status = "FAILED"
        elif util_pct > 95:
            status = "OVERLOADED"
        elif util_pct > 80:
            status = "WARNING"
        elif scenario == "blocked_drain" and props.get("type") in ["inlet", "culvert"] and util_pct > 70:
            status = "BLOCKED"
        else:
            status = "NORMAL"
            
        results.append({
            "node_id": props.get("id"),
            "name": props.get("name"),
            "type": props.get("type"),
            "capacity": f"{props.get('capacity_lps')} LPS",
            "utilization_pct": util_pct,
            "status": status,
            "affected_roads": 2 if status in ["OVERLOADED", "FAILED", "BLOCKED"] else 0
        })
    return results

def analyze_infrastructure(hotspots: List[Dict], critical_infra: List[Dict]) -> List[Dict]:
    road_features = _load_geojson("roads.geojson")
    road_map = {}
    for idx, f in enumerate(road_features):
        props = f.get("properties", {})
        name = props.get("name", "")
        rid = "road_" + name.lower().replace(" ", "_").replace("–", "_").replace("/", "_")[:40] if name else f"road_{idx:03d}"
        road_map[rid] = f

    results = []
    for infra in critical_infra:
        props = infra.get("properties", {})
        icoord = infra["geometry"]["coordinates"]
        
        nearest_hotspot = None
        min_dist = 500
        
        for hs in hotspots:
            rfeat = road_map.get(hs["road_id"])
            if rfeat:
                rmid = _get_road_midpoint(rfeat)
                dist = _calculate_distance(rmid, icoord)
                if dist < min_dist:
                    min_dist = dist
                    nearest_hotspot = hs
                    
        if nearest_hotspot and min_dist < 200:
            risk = nearest_hotspot["risk_level"]
            acc = "INACCESSIBLE" if risk == "severe" else "AT RISK"
            nearest_name = nearest_hotspot["road_name"]
        else:
            risk = "low"
            acc = "SAFE"
            nearest_name = "N/A"
            
        results.append({
            "facility_id": props.get("id"),
            "name": props.get("name"),
            "type": props.get("type"),
            "risk_level": risk,
            "accessibility": acc,
            "nearest_road": nearest_name
        })
        
    return results

def generate_recommendations(hotspots: List[Dict], drainage: List[Dict], infra: List[Dict]) -> List[Dict]:
    recs = []
    
    # 1. Drainage recommendations
    for d in drainage:
        if d["status"] == "BLOCKED":
            recs.append({
                "priority": "CRITICAL",
                "action": f"Clear drainage node {d['node_id']}",
                "reason": "Drainage blockage is contributing to severe road flooding",
                "location": d['name'],
                "urgency": "Immediate"
            })
        elif d["status"] == "FAILED":
            recs.append({
                "priority": "CRITICAL",
                "action": f"Deploy mobile pumps to {d['node_id']}",
                "reason": "Pump station failure detected",
                "location": d['name'],
                "urgency": "Immediate"
            })
        elif d["status"] == "OVERLOADED":
            recs.append({
                "priority": "HIGH",
                "action": f"Monitor {d['node_id']} capacity",
                "reason": f"Drainage utilization at {d['utilization_pct']}%",
                "location": d['name'],
                "urgency": "T+30 min"
            })
            
    # 2. Infra recommendations
    for i in infra:
        if i["accessibility"] == "INACCESSIBLE":
            recs.append({
                "priority": "CRITICAL",
                "action": f"Redirect emergency traffic for {i['name']}",
                "reason": "Facility is inaccessible due to severe flooding on nearest road",
                "location": i['name'],
                "urgency": "Immediate"
            })
        elif i["accessibility"] == "AT RISK":
            recs.append({
                "priority": "HIGH",
                "action": f"Prioritize access route protection for {i['name']}",
                "reason": "Facility access route is at high risk of flooding",
                "location": i['name'],
                "urgency": "T+45 min"
            })
            
    # 3. Hotspot recommendations
    for h in hotspots:
        if h["risk_level"] == "severe":
            recs.append({
                "priority": "CRITICAL",
                "action": "Restrict traffic",
                "reason": f"Severe water depth ({h['water_depth_m']}m) detected",
                "location": h["road_name"],
                "urgency": "Immediate"
            })
            
    # Sort recs by priority
    priority_map = {"CRITICAL": 3, "HIGH": 2, "MEDIUM": 1, "LOW": 0}
    recs.sort(key=lambda x: priority_map.get(x["priority"], 0), reverse=True)
    
    # Return top 5 unique recommendations
    unique_recs = []
    seen = set()
    for r in recs:
        key = f"{r['action']}-{r['location']}"
        if key not in seen:
            seen.add(key)
            unique_recs.append(r)
            if len(unique_recs) >= 5:
                break
                
    return unique_recs

def run_decision_analysis(
    rainfall_intensity_mm_hr: float,
    duration_minutes: int,
    drainage_condition: float,
    scenario: str,
    time_minutes: int
) -> Dict:
    sim_result = run_simulation(
        rainfall_intensity_mm_hr,
        duration_minutes,
        drainage_condition,
        scenario
    )
    
    critical_infra = _load_geojson("critical_infra.geojson")
    
    hotspots = analyze_hotspots(sim_result, time_minutes, critical_infra)
    causes = explain_causes(scenario, rainfall_intensity_mm_hr, drainage_condition)
    drainage = analyze_drainage(scenario, drainage_condition, rainfall_intensity_mm_hr)
    infra_impact = analyze_infrastructure(hotspots, critical_infra)
    recs = generate_recommendations(hotspots, drainage, infra_impact)
    
    return {
        "status": "simulated",
        "time_minutes": time_minutes,
        "hotspots": hotspots,
        "drainage_health": drainage,
        "critical_infrastructure": infra_impact,
        "explanations": [causes], # As a list since the spec said explanations: []
        "recommendations": recs
    }
