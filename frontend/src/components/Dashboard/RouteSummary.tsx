import { Navigation, AlertTriangle, Info, GitCompare } from "lucide-react";
import type { RoutingResponse, CompareResponse } from "../../types";
import { RISK_COLORS, SCENARIO_LABELS } from "../../types";

interface RouteSummaryProps {
  routingData: RoutingResponse | null;
  comparisonData: CompareResponse | null;
  isOutdated: boolean;
}

export function RouteSummary({ routingData, comparisonData, isOutdated }: RouteSummaryProps) {
  const hasData = routingData || comparisonData;
  const outdatedStyle = isOutdated ? { opacity: 0.6, filter: "grayscale(50%)" } : {};
  const P: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #D9E0E7", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", borderRadius: 8, padding: "14px 16px", width: 300, display: "flex", flexDirection: "column", gap: 10, ...outdatedStyle };

  return (
    <div style={P}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Navigation size={14} color={hasData ? "#16A34A" : "#94A3B8"} />
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#1F2937", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {routingData ? "Route Summary" : comparisonData ? "Scenario Comparison" : "Route Summary"}
        </h3>
      </div>

      {isOutdated && (
        <div style={{ fontSize: 10, color: "#92400E", background: "#FFFBEB", padding: "6px 8px", borderRadius: 5, border: "1px solid #FDE68A" }}>
          <AlertTriangle size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "text-bottom" }} />
          <strong>Timeline changed.</strong> Recalculate routes for the selected time.
        </div>
      )}

      {!hasData && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <Metric label="Route type" value="No route selected" />
          <Metric label="Mode" value="—" />
          <Metric label="Distance" value="—" />
          <Metric label="Roads in Route" value="—" />
          <Metric label="Max Risk" value="—" />
          <Metric label="Max Depth" value="—" />
          <Metric label="Status" value="Awaiting simulation" />
        </div>
      )}

      {routingData && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <Metric label="Route type" value={routingData.routing_mode === "safest" ? "Safe" : routingData.routing_mode === "shortest" ? "Direct" : "Emergency"} color={routingData.routing_mode === "safest" ? "#16A34A" : undefined} />
            <Metric label="Mode" value={routingData.routing_mode === "safest" ? "Avoids high risk" : routingData.routing_mode === "shortest" ? "Shortest" : "Emergency"} />
            <Metric label="Distance" value={routingData.route_found ? `${(routingData.estimated_distance_m / 1000).toFixed(1)} km` : "-"} />
            <Metric label="Roads in Route" value={routingData.route_found ? `${routingData.route_segment_count || 0} segments` : "-"} />
            <Metric label="Max Risk" value={routingData.route_found ? routingData.maximum_risk_level : "-"} color={routingData.route_found ? RISK_COLORS[routingData.maximum_risk_level] : undefined} />
            <Metric label="Max Depth" value={routingData.route_found ? `${routingData.maximum_water_depth_m.toFixed(2)} m` : "-"} />
          </div>

          <div style={{ fontSize: 11, color: "#64748B", display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
            {routingData.high_risk_roads_included && routingData.high_risk_roads_included.length > 0 && (
              <div style={{ color: "#EF4444" }}>⚠ Includes {routingData.high_risk_roads_included.length} high-risk road(s)</div>
            )}
            {routingData.high_risk_roads_avoided && routingData.high_risk_roads_avoided.length > 0 && (
              <div style={{ color: "#16A34A" }}>✓ Avoids {routingData.high_risk_roads_avoided.length} high-risk road(s)</div>
            )}
          </div>

          {routingData.warnings.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {routingData.warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 10, color: "#EF4444", display: "flex", gap: 4, alignItems: "flex-start", background: "#FEF2F2", padding: 6, borderRadius: 4 }}>
                  <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />{w}
                </div>
              ))}
            </div>
          )}

          {routingData.routing_mode === "emergency" && (
            <div style={{ fontSize: 10, color: "#64748B", display: "flex", gap: 4, alignItems: "flex-start", background: "#F8FAFC", padding: 6, borderRadius: 4, border: "1px solid #E8ECF0" }}>
              <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} color="#2563EB" />
              <div>Emergency routing is simulated and must be verified by authorities.
                {routingData.is_emergency_suitable ? (
                  <span style={{ color: "#16A34A", display: "block", marginTop: 2 }}>Route avoids severe risk roads.</span>
                ) : (
                  <span style={{ color: "#EF4444", display: "block", marginTop: 2 }}>Route contains high/severe risk roads!</span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {comparisonData && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, borderBottom: "1px solid #E8ECF0", paddingBottom: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>{SCENARIO_LABELS[comparisonData.scenario_a.scenario]}</span>
              <span style={{ fontSize: 11, color: comparisonData.scenario_a.route_found ? "#16A34A" : "#EF4444" }}>
                {comparisonData.scenario_a.route_found ? `${comparisonData.scenario_a.estimated_distance_m}m` : "No Route"}
              </span>
              <span style={{ fontSize: 11, color: comparisonData.scenario_a.route_found ? RISK_COLORS[comparisonData.scenario_a.maximum_risk_level] : "#94A3B8", textTransform: "capitalize" }}>
                Risk: {comparisonData.scenario_a.route_found ? comparisonData.scenario_a.maximum_risk_level : "N/A"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>{SCENARIO_LABELS[comparisonData.scenario_b.scenario]}</span>
              <span style={{ fontSize: 11, color: comparisonData.scenario_b.route_found ? "#16A34A" : "#EF4444" }}>
                {comparisonData.scenario_b.route_found ? `${comparisonData.scenario_b.estimated_distance_m}m` : "No Route"}
              </span>
              <span style={{ fontSize: 11, color: comparisonData.scenario_b.route_found ? RISK_COLORS[comparisonData.scenario_b.maximum_risk_level] : "#94A3B8", textTransform: "capitalize" }}>
                Risk: {comparisonData.scenario_b.route_found ? comparisonData.scenario_b.maximum_risk_level : "N/A"}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#64748B", display: "flex", gap: 4, alignItems: "center" }}>
            <GitCompare size={12} color="#94A3B8" /> Route Changed: <span style={{ color: comparisonData.route_changed ? "#F59E0B" : "#16A34A" }}>{comparisonData.route_changed ? "Yes" : "No"}</span>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{ background: "#F8FAFC", padding: "6px 10px", borderRadius: 5, border: "1px solid #E8ECF0" }}>
      <div style={{ fontSize: 9, color: "#94A3B8", marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: color || "#1F2937", textTransform: "capitalize" }}>{value}</div>
    </div>
  );
}