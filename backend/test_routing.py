import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.routing.graph import RoadGraph, dijkstra_route, RISK_PENALTIES, EMERGENCY_SEVERE_PENALTY

client = TestClient(app)

def test_routing_graph_building():
    graph = RoadGraph()
    # At least 9 roads are in the new connected GeoJSON
    assert len(graph.edges) >= 9
    # The graph should be well connected now, with no disconnected roads
    assert len(graph.disconnected_roads) == 0

def test_route_endpoint_valid():
    response = client.post(
        "/api/routing/route",
        json={
            "start_road_id": "road_weh_mid",
            "end_road_id": "road_lbs_mid",
            "time_minutes": 90,
            "routing_mode": "safest",
            "rainfall_intensity_mm_hr": 80,
            "duration_minutes": 180,
            "scenario": "normal",
            "drainage_condition": 0.7
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "simulated"
    assert data["route_found"] is True
    assert len(data["route_road_ids"]) > 0
    assert "route_geometry" in data
    assert data["route_geometry"] is not None
    assert "maximum_water_depth_m" in data
    assert "high_risk_roads_included" in data
    assert "high_risk_roads_avoided" in data
    # Safe route should avoid some high-risk roads compared to shortest
    assert isinstance(data["high_risk_roads_avoided"], list)

def test_route_endpoint_same_road():
    response = client.post(
        "/api/routing/route",
        json={
            "start_road_id": "road_weh_mid",
            "end_road_id": "road_weh_mid",
            "time_minutes": 90,
            "routing_mode": "safest",
            "rainfall_intensity_mm_hr": 80,
            "duration_minutes": 180,
            "scenario": "normal",
            "drainage_condition": 0.7
        }
    )
    assert response.status_code == 422
    assert "same" in response.json()["detail"].lower()

def test_route_endpoint_invalid_road():
    response = client.post(
        "/api/routing/route",
        json={
            "start_road_id": "invalid_road",
            "end_road_id": "road_lbs_mid",
            "time_minutes": 90,
            "routing_mode": "safest",
            "rainfall_intensity_mm_hr": 80,
            "duration_minutes": 180,
            "scenario": "normal",
            "drainage_condition": 0.7
        }
    )
    assert response.status_code == 422

def test_compare_endpoint_valid():
    response = client.post(
        "/api/routing/compare",
        json={
            "start_road_id": "road_weh_mid",
            "end_road_id": "road_lbs_mid",
            "time_minutes": 90,
            "routing_mode": "safest",
            "rainfall_intensity_mm_hr": 80,
            "duration_minutes": 180,
            "scenario_a": "normal",
            "scenario_b": "extreme_rainfall",
            "drainage_condition": 0.7
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["scenario_a"]["route_found"] is True
    assert data["scenario_b"]["route_found"] is True
    assert "route_geometry" in data["scenario_a"]
    assert "maximum_water_depth_m" in data["scenario_a"]
    assert isinstance(data["scenario_a"]["high_risk_roads_included"], list)

def test_dijkstra_logic():
    # Create a mock graph for testing routing modes
    graph = RoadGraph()
    graph.edges = {
        "road_A": {"road_id": "road_A", "u": 0, "v": 1, "length_m": 100},
        "road_E": {"road_id": "road_E", "u": 1, "v": 2, "length_m": 200},
        "road_B": {"road_id": "road_B", "u": 2, "v": 4, "length_m": 500},
        "road_C": {"road_id": "road_C", "u": 1, "v": 3, "length_m": 1000},
        "road_D": {"road_id": "road_D", "u": 3, "v": 2, "length_m": 100}
    }
    graph.adj = {
        0: [graph.edges["road_A"]],
        1: [graph.edges["road_A"], graph.edges["road_E"], graph.edges["road_C"]],
        2: [graph.edges["road_E"], graph.edges["road_D"], graph.edges["road_B"]],
        3: [graph.edges["road_C"], graph.edges["road_D"]],
        4: [graph.edges["road_B"]]
    }
    
    risks = {"road_A": "low", "road_B": "low", "road_C": "low", "road_D": "low", "road_E": "severe"}
    
    # Test shortest path: A -> E -> B
    found, path, cost, dist, max_risk, warns = dijkstra_route(graph, "road_A", "road_B", "shortest", risks)
    assert found
    assert path == ["road_A", "road_E", "road_B"]
    assert dist == 800
    
    # Test safest path: A -> C -> D -> B
    found, path, cost, dist, max_risk, warns = dijkstra_route(graph, "road_A", "road_B", "safest", risks)
    assert found
    assert path == ["road_A", "road_C", "road_D", "road_B"]
    assert max_risk == "low"
