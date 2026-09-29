import json
import math
from pathlib import Path
from typing import Dict, List, Tuple, Set, Optional

from app.config import settings

# ────────────────────────────────────────────────────────────────────
# ROUTING COST PARAMETERS
# ────────────────────────────────────────────────────────────────────
RISK_PENALTIES = {
    "low": 1.0,
    "moderate": 2.0,
    "high": 8.0,
    "severe": 1000.0,
}

EMERGENCY_SEVERE_PENALTY = 10000.0

# Graph building tolerance
SNAPPING_TOLERANCE_M = 100.0


# ────────────────────────────────────────────────────────────────────
# HELPER: HAVERSINE DISTANCE
# ────────────────────────────────────────────────────────────────────
def haversine_distance_m(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Calculate the great circle distance in meters between two points."""
    R = 6371000  # Radius of earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2)**2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


# ────────────────────────────────────────────────────────────────────
# GRAPH CONSTRUCTION
# ────────────────────────────────────────────────────────────────────
class RoadGraph:
    def __init__(self):
        # We will represent the graph such that nodes are abstract intersections,
        # and edges are the roads connecting them.
        self.adj: Dict[int, List[dict]] = {}  # node_id -> list of edge dicts
        self.edges: Dict[str, dict] = {}      # road_id -> edge details
        self.node_coords: Dict[int, Tuple[float, float]] = {}
        
        self.disconnected_roads: List[str] = []
        
        self._build_graph()

    def _get_or_create_node(self, lon: float, lat: float) -> int:
        """Find an existing node within SNAPPING_TOLERANCE_M, or create a new one."""
        for nid, (nlon, nlat) in self.node_coords.items():
            if haversine_distance_m(lon, lat, nlon, nlat) <= SNAPPING_TOLERANCE_M:
                return nid
                
        # Create new node
        new_id = len(self.node_coords)
        self.node_coords[new_id] = (lon, lat)
        self.adj[new_id] = []
        return new_id

    def _build_graph(self):
        """Read roads.geojson and build nodes and edges using endpoint snapping."""
        roads_path = settings.DATA_DIR / "roads.geojson"
        if not roads_path.exists():
            return
            
        with open(roads_path, "r", encoding="utf-8") as f:
            collection = json.load(f)
            
        features = collection.get("features", [])
        
        for idx, feature in enumerate(features):
            props = feature.get("properties", {})
            name = props.get("name", "")
            if name:
                road_id = "road_" + name.lower().replace(" ", "_").replace("–", "_").replace("/", "_")[:40]
            else:
                road_id = f"road_{idx:03d}"
                
            coords = feature.get("geometry", {}).get("coordinates", [])
            if not coords or len(coords) < 2:
                self.disconnected_roads.append(road_id)
                continue
                
            start_coord = coords[0]
            end_coord = coords[-1]
            
            # Approximate length
            length_m = 0.0
            for i in range(len(coords) - 1):
                length_m += haversine_distance_m(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1])
                
            node_u = self._get_or_create_node(start_coord[0], start_coord[1])
            node_v = self._get_or_create_node(end_coord[0], end_coord[1])
            
            edge_data = {
                "road_id": road_id,
                "name": name,
                "u": node_u,
                "v": node_v,
                "length_m": length_m
            }
            self.edges[road_id] = edge_data
            
            # Add to adjacency (undirected)
            self.adj[node_u].append(edge_data)
            if node_u != node_v:
                self.adj[node_v].append(edge_data)

        # Check for disconnected roads
        # A road is disconnected if its start and end nodes only connect to this single road.
        for road_id, edge in self.edges.items():
            u, v = edge["u"], edge["v"]
            # To be connected, either u or v must have > 1 edge attached.
            if len(self.adj[u]) <= 1 and len(self.adj[v]) <= 1:
                self.disconnected_roads.append(road_id)
                
        # Log prototype warnings
        if self.disconnected_roads:
            print(f"[Prototype Warning] The following roads are disconnected due to {SNAPPING_TOLERANCE_M}m snapping tolerance: {self.disconnected_roads}")


# ────────────────────────────────────────────────────────────────────
# DIJKSTRA ROUTING
# ────────────────────────────────────────────────────────────────────
def dijkstra_route(
    graph: RoadGraph,
    start_road_id: str,
    end_road_id: str,
    mode: str,
    road_risks: Dict[str, str]
) -> Tuple[bool, List[str], float, float, str, List[str]]:
    """
    Runs Dijkstra's algorithm.
    Returns: (route_found, route_road_ids, total_cost, total_distance, max_risk, warnings)
    
    Since we route from a "start road" to an "end road", we will:
    1. Treat the endpoints of start_road as starting nodes (cost 0).
    2. Run Dijkstra to all other nodes.
    3. The destination is reached when we traverse the end_road.
    """
    warnings = []
    
    if start_road_id not in graph.edges:
        warnings.append(f"Start road '{start_road_id}' not found in graph.")
        return False, [], 0.0, 0.0, "low", warnings
    if end_road_id not in graph.edges:
        warnings.append(f"End road '{end_road_id}' not found in graph.")
        return False, [], 0.0, 0.0, "low", warnings
        
    if start_road_id == end_road_id:
        warnings.append("Start and end roads are the same.")
        return False, [], 0.0, 0.0, "low", warnings
        
    start_edge = graph.edges[start_road_id]
    
    # Priority queue: (cost, node, path_of_road_ids, path_dist, max_risk)
    import heapq
    pq = []
    
    # We can start from either end of the start road. 
    # Since we are "on" the start road, it is already part of the path.
    # We will assume we traverse the whole start road.
    
    def get_cost(length_m: float, risk: str) -> float:
        if mode == "shortest":
            return length_m
        
        penalty = RISK_PENALTIES.get(risk, 1.0)
        if mode == "emergency" and risk == "severe":
            penalty = EMERGENCY_SEVERE_PENALTY
            
        return length_m * penalty

    def higher_risk(r1: str, r2: str) -> str:
        order = {"low": 1, "moderate": 2, "high": 3, "severe": 4}
        return r1 if order.get(r1, 1) >= order.get(r2, 1) else r2

    start_risk = road_risks.get(start_road_id, "low")
    start_cost = get_cost(start_edge["length_m"], start_risk)
    
    # Start at both ends of the start road
    heapq.heappush(pq, (start_cost, start_edge["v"], [start_road_id], start_edge["length_m"], start_risk))
    heapq.heappush(pq, (start_cost, start_edge["u"], [start_road_id], start_edge["length_m"], start_risk))
    
    visited = set()
    
    while pq:
        cost, curr_node, path, dist, max_risk = heapq.heappop(pq)
        
        if (curr_node, path[-1]) in visited:
            continue
        visited.add((curr_node, path[-1]))
        
        # If the last road added was our destination, we are done!
        if path[-1] == end_road_id:
            # Check for warnings
            if mode == "emergency" and max_risk in ("high", "severe"):
                warnings.append("Warning: Emergency route contains high or severe risk roads. Proceed with extreme caution.")
            elif max_risk == "severe":
                warnings.append("Warning: Route contains severe risk roads.")
            
            return True, path, cost, dist, max_risk, warnings
            
        # Explore neighbors
        for edge in graph.adj[curr_node]:
            next_road = edge["road_id"]
            if next_road in path:
                continue # avoid cycles
                
            next_node = edge["v"] if edge["u"] == curr_node else edge["u"]
            next_length = edge["length_m"]
            next_risk = road_risks.get(next_road, "low")
            
            edge_cost = get_cost(next_length, next_risk)
            new_cost = cost + edge_cost
            new_dist = dist + next_length
            new_max_risk = higher_risk(max_risk, next_risk)
            
            heapq.heappush(pq, (new_cost, next_node, path + [next_road], new_dist, new_max_risk))
            
    warnings.append("No valid route found between the selected roads. The graph may be disconnected.")
    return False, [], 0.0, 0.0, "low", warnings

# Global singleton to avoid rebuilding graph on every request
_ROAD_GRAPH = None

def get_road_graph() -> RoadGraph:
    global _ROAD_GRAPH
    if _ROAD_GRAPH is None:
        _ROAD_GRAPH = RoadGraph()
    return _ROAD_GRAPH
