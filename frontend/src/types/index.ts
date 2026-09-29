import type { FeatureCollection } from "geojson";

/** State for a single GeoJSON layer */
export interface GeoLayerState {
  id: string;
  label: string;
  color: string;
  visible: boolean;
  data: FeatureCollection | null;
  loading: boolean;
  error: string | null;
}

/** API health response */
export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

/** Layer list response from /api/geodata/layers */
export interface LayersListResponse {
  layers: string[];
}

/* ──────────────────────────────────────────────────────────────────
   SIMULATION TYPES
   All types mirror the backend response exactly so the frontend
   uses the API as the single source of truth.
   ────────────────────────────────────────────────────────────────── */

/** Supported simulation scenarios */
export type SimulationScenario =
  | "normal"
  | "blocked_drain"
  | "pump_failure"
  | "extreme_rainfall";

/** Request body for POST /api/simulation/run */
export interface SimulationRequest {
  rainfall_intensity_mm_hr: number;
  duration_minutes: number;
  drainage_condition: number;
  scenario: SimulationScenario;
}

/** Risk level as classified by the backend */
export type RiskLevel = "low" | "moderate" | "high" | "severe";

/** A single time-step result for one road */
export interface RoadTimeStepResult {
  time_minutes: number;
  water_depth_m: number;
  risk_level: RiskLevel;
  arrival_time_minutes: number | null;
}

/** Complete results for one road */
export interface RoadSimResult {
  road_id: string;
  name: string;
  results: RoadTimeStepResult[];
}

/** Full response from POST /api/simulation/run */
export interface SimulationResponse {
  status: "simulated";
  scenario: SimulationScenario;
  rainfall_intensity_mm_hr: number;
  duration_minutes: number;
  drainage_condition: number;
  time_steps: number[];
  risk_thresholds_m: Record<string, number>;
  roads: RoadSimResult[];
  disclaimer: string;
}

/** Risk color mapping used by the frontend — keyed by RiskLevel */
export const RISK_COLORS: Record<RiskLevel, string> = {
  low: "#10b981",       // green
  moderate: "#f59e0b",  // amber
  high: "#ef4444",      // red
  severe: "#991b1b",    // dark red
};

/** Human-readable scenario labels */
export const SCENARIO_LABELS: Record<SimulationScenario, string> = {
  normal: "Normal",
  blocked_drain: "Blocked Drain",
  pump_failure: "Pump Failure",
  extreme_rainfall: "Extreme Rainfall",
};

/* ──────────────────────────────────────────────────────────────────
   ROUTING TYPES
   ────────────────────────────────────────────────────────────────── */

export type RoutingMode = "shortest" | "safest" | "emergency";

export interface RoutingRequest {
  start_road_id: string;
  end_road_id: string;
  time_minutes: number;
  routing_mode: RoutingMode;
  rainfall_intensity_mm_hr: number;
  duration_minutes: number;
  scenario: SimulationScenario;
  drainage_condition: number;
}

export interface RoutingResponse {
  status: string;
  routing_mode: string;
  time_minutes: number;
  start_road_id: string;
  end_road_id: string;
  route_found: boolean;
  route_road_ids: string[];
  route_geometry: any;
  route_segment_count: number;
  estimated_distance_m: number;
  total_cost: number;
  maximum_risk_level: RiskLevel;
  maximum_water_depth_m: number;
  high_risk_roads_included: string[];
  high_risk_roads_avoided: string[];
  warnings: string[];
  is_emergency_suitable: boolean;
}

export interface CompareRequest {
  start_road_id: string;
  end_road_id: string;
  time_minutes: number;
  routing_mode: RoutingMode;
  rainfall_intensity_mm_hr: number;
  duration_minutes: number;
  scenario_a: SimulationScenario;
  scenario_b: SimulationScenario;
  drainage_condition: number;
}

export interface ScenarioCompareResult {
  scenario: SimulationScenario;
  route_found: boolean;
  route_road_ids: string[];
  route_geometry: any;
  route_segment_count: number;
  estimated_distance_m: number;
  maximum_risk_level: RiskLevel;
  maximum_water_depth_m: number;
  high_risk_roads_included: string[];
  high_risk_roads_avoided: string[];
}

export interface CompareResponse {
  status: "simulated";
  scenario_a: ScenarioCompareResult;
  scenario_b: ScenarioCompareResult;
  route_changed: boolean;
  added_roads: string[];
  removed_roads: string[];
  warnings: string[];
}

// ────────────────────────────────────────────────────────────────────
// Decision Intelligence Response
// ────────────────────────────────────────────────────────────────────

export interface Recommendation {
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  action: string;
  reason: string;
  location: string;
  urgency: string;
}

export interface Hotspot {
  road_id: string;
  road_name: string;
  risk_level: RiskLevel;
  water_depth_m: number;
  arrival_time_minutes: number;
  priority: string;
  priority_score: number;
}

export interface DrainageNodeHealth {
  node_id: string;
  name: string;
  type: string;
  capacity: string;
  utilization_pct: number;
  status: "NORMAL" | "WARNING" | "OVERLOADED" | "BLOCKED" | "FAILED";
  affected_roads: number;
}

export interface InfraImpact {
  facility_id: string;
  name: string;
  type: string;
  risk_level: RiskLevel;
  accessibility: "SAFE" | "AT RISK" | "INACCESSIBLE";
  nearest_road: string;
}

export interface Explanation {
  primary_cause: string;
  contributing_factors: string[];
  confidence: string;
}

export interface DecisionResponse {
  status: string;
  time_minutes: number;
  hotspots: Hotspot[];
  drainage_health: DrainageNodeHealth[];
  critical_infrastructure: InfraImpact[];
  explanations: Explanation[];
  recommendations: Recommendation[];
}
