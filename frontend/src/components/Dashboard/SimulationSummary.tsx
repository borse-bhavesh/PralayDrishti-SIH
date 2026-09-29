import { Droplets, AlertTriangle, MapPin, TrendingUp } from "lucide-react";
import type { SimulationResponse, RiskLevel, RoadTimeStepResult } from "../../types";
import { RISK_COLORS, SCENARIO_LABELS } from "../../types";

interface SimulationSummaryProps {
  simulation: SimulationResponse | null;
  currentTimeStep: number;
  onSelectRoad: (roadId: string) => void;
  selectedRoadId: string | null;
}

export function SimulationSummary({ simulation, currentTimeStep, onSelectRoad, selectedRoadId }: SimulationSummaryProps) {
  const currentResults: { roadId: string; name: string; data: RoadTimeStepResult }[] = [];

  if (simulation) {
    for (const road of simulation.roads) {
      const step = road.results.find((r) => r.time_minutes === currentTimeStep);
      if (step) { currentResults.push({ roadId: road.road_id, name: road.name, data: step }); }
    }
  }

  const riskCounts: Record<RiskLevel, number> = { low: 0, moderate: 0, high: 0, severe: 0 };
  let maxDepth = 0;
  let affectedRoads = 0;
  for (const r of currentResults) {
    riskCounts[r.data.risk_level]++;
    maxDepth = Math.max(maxDepth, r.data.water_depth_m);
    if (r.data.risk_level !== "low") affectedRoads++;
  }

  const selectedRoad = simulation?.roads.find((r) => r.road_id === selectedRoadId);
  const selectedStep = selectedRoad?.results.find((r) => r.time_minutes === currentTimeStep);

  const RISK_ORDER: RiskLevel[] = ["low", "moderate", "high", "severe"];

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #D9E0E7", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", borderRadius: 8, padding: "14px 16px", width: 300, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <TrendingUp size={14} color="#2563EB" />
          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#1F2937", textTransform: "uppercase", letterSpacing: "0.04em" }}>Simulation Results</h3>
        </div>
      </div>

      {/* Parameters */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <InfoChip label="Scenario" value={simulation ? SCENARIO_LABELS[simulation.scenario] : "Not simulated"} />
        <InfoChip label="Intensity" value={simulation ? `${simulation.rainfall_intensity_mm_hr} mm/hr` : "—"} />
        <InfoChip label="Duration" value={simulation ? `${simulation.duration_minutes} min` : "—"} />
        <InfoChip label="Current Time" value={simulation ? `T+${currentTimeStep} min` : "—"} />
      </div>

      {/* Risk Distribution */}
      <div>
        <div style={{ fontSize: 10, color: "#64748B", fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Risk Distribution</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {RISK_ORDER.map((level) => (
            <div key={level} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", background: riskCounts[level] > 0 ? `${RISK_COLORS[level]}10` : "#F8FAFC", border: `1px solid ${riskCounts[level] > 0 ? `${RISK_COLORS[level]}30` : "#E8ECF0"}`, borderRadius: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: RISK_COLORS[level], flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#64748B", textTransform: "capitalize" }}>{level}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: RISK_COLORS[level] }}>{riskCounts[level]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div style={{ padding: "8px 10px", background: "#F8FAFC", border: "1px solid #E8ECF0", borderRadius: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}><Droplets size={12} color="#2563EB" /><span style={{ fontSize: 9, color: "#94A3B8" }}>Max Depth</span></div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1F2937" }}>{maxDepth.toFixed(2)} m</div>
        </div>
        <div style={{ padding: "8px 10px", background: "#F8FAFC", border: "1px solid #E8ECF0", borderRadius: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}><AlertTriangle size={12} color="#F59E0B" /><span style={{ fontSize: 9, color: "#94A3B8" }}>Affected</span></div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1F2937" }}>{affectedRoads} / {currentResults.length}</div>
        </div>
      </div>

      {/* Road list */}
      <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 2, fontWeight: 500, textTransform: "uppercase" }}>Roads</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {currentResults.map((r) => (
          <button key={r.roadId} onClick={() => onSelectRoad(r.roadId)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: r.roadId === selectedRoadId ? "#EFF6FF" : "#FFFFFF", border: `1px solid ${r.roadId === selectedRoadId ? "#BFDBFE" : "#E8ECF0"}`, borderRadius: 5, cursor: "pointer", width: "100%", textAlign: "left", color: "inherit", transition: "all 0.1s ease" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: RISK_COLORS[r.data.risk_level], flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 11, color: "#1F2937", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
            <span style={{ fontSize: 10, color: "#94A3B8", flexShrink: 0 }}>{r.data.water_depth_m.toFixed(2)}m</span>
          </button>
        ))}
      </div>

      {/* Selected road details */}
      {selectedRoad && selectedStep && (
        <div style={{ padding: "8px 10px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 5 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#1F2937", marginBottom: 6 }}>
            <MapPin size={11} color="#2563EB" style={{ display: "inline", marginRight: 4 }} />{selectedRoad.name}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, fontSize: 11 }}>
            <DetailRow label="Depth" value={`${selectedStep.water_depth_m.toFixed(3)} m`} />
            <DetailRow label="Risk" value={selectedStep.risk_level} color={RISK_COLORS[selectedStep.risk_level]} />
            <DetailRow label="Arrival" value={selectedStep.arrival_time_minutes !== null ? `T+${selectedStep.arrival_time_minutes}m` : "—"} />
            <DetailRow label="Time" value={`T+${currentTimeStep}m`} />
          </div>
        </div>
      )}

      <div style={{ padding: "4px 6px", background: simulation ? "#FFFBEB" : "#F8FAFC", border: simulation ? "1px solid #FDE68A" : "1px solid #E8ECF0", borderRadius: 4, fontSize: 9, color: simulation ? "#92400E" : "#94A3B8", textAlign: "center", fontStyle: "italic" }}>
        {simulation ? "⚠ Simulated — illustrative only" : "Run simulation to view results"}
      </div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "4px 8px", background: "#F8FAFC", borderRadius: 4, border: "1px solid #E8ECF0" }}>
      <div style={{ fontSize: 9, color: "#94A3B8" }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#1F2937" }}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <span style={{ color: "#94A3B8" }}>{label}: </span>
      <span style={{ fontWeight: 600, color: color || "#1F2937", textTransform: "capitalize" }}>{value}</span>
    </div>
  );
}