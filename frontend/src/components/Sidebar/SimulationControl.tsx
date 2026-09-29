import { useState } from "react";
import { Play, Loader2, RotateCcw, AlertTriangle } from "lucide-react";
import type { SimulationScenario, SimulationRequest, SimulationResponse } from "../../types";
import { SCENARIO_LABELS } from "../../types";
import { API_BASE_URL } from "../../config/api";

interface SimulationControlProps {
  onSimulationResult: (data: SimulationResponse) => void;
  onClearSimulation: () => void;
  hasSimulation: boolean;
}

const SCENARIOS: SimulationScenario[] = ["normal", "blocked_drain", "pump_failure", "extreme_rainfall"];

export function SimulationControl({ onSimulationResult, onClearSimulation, hasSimulation }: SimulationControlProps) {
  const [intensity, setIntensity] = useState(60);
  const [duration, setDuration] = useState(180);
  const [scenario, setScenario] = useState<SimulationScenario>("normal");
  const [drainageCondition, setDrainageCondition] = useState(0.7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (intensity <= 0) return "Rainfall intensity must be positive.";
    if (intensity > 300) return "Rainfall intensity cannot exceed 300 mm/hr.";
    if (duration < 30) return "Duration must be at least 30 minutes.";
    if (duration > 360) return "Duration cannot exceed 360 minutes.";
    if (!SCENARIOS.includes(scenario)) return `Invalid scenario: ${scenario}`;
    return null;
  }

  async function handleRun() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError(null);
    const body: SimulationRequest = { rainfall_intensity_mm_hr: intensity, duration_minutes: duration, drainage_condition: drainageCondition, scenario };
    try {
      const res = await fetch(`${API_BASE_URL}/api/simulation/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const detail = await res.text(); throw new Error(`HTTP ${res.status}: ${detail}`); }
      const data: SimulationResponse = await res.json();
      onSimulationResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 500, color: "#64748B", marginBottom: 5 };
  const sliderStyle: React.CSSProperties = { width: "100%", accentColor: "#2563EB", cursor: "pointer" };
  const valueRowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94A3B8", marginTop: 2 };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B" }}>Flood Simulation</span>
        <span style={{ marginLeft: "auto", fontSize: 9, color: "#94A3B8", fontStyle: "italic" }}>illustrative</span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Rainfall Intensity (mm/hr)</label>
        <input type="range" min={5} max={200} step={5} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} style={sliderStyle} />
        <div style={valueRowStyle}><span>5</span><span style={{ color: "#1F2937", fontWeight: 600, fontSize: 12 }}>{intensity} mm/hr</span><span>200</span></div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Duration (minutes)</label>
        <input type="range" min={30} max={360} step={30} value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={sliderStyle} />
        <div style={valueRowStyle}><span>30m</span><span style={{ color: "#1F2937", fontWeight: 600, fontSize: 12 }}>{duration} min</span><span>360m</span></div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Drainage Condition</label>
        <input type="range" min={0} max={1} step={0.1} value={drainageCondition} onChange={(e) => setDrainageCondition(Number(e.target.value))} style={sliderStyle} />
        <div style={valueRowStyle}><span>Blocked</span><span style={{ color: "#1F2937", fontWeight: 600, fontSize: 12 }}>{Math.round(drainageCondition * 100)}%</span><span>Optimal</span></div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Scenario</label>
        <select value={scenario} onChange={(e) => setScenario(e.target.value as SimulationScenario)}
          style={{ width: "100%", padding: "7px 10px", background: "#F8FAFC", border: "1px solid #D9E0E7", borderRadius: 5, color: "#1F2937", fontSize: 12, outline: "none", cursor: "pointer" }}>
          {SCENARIOS.map((s) => (<option key={s} value={s}>{SCENARIO_LABELS[s]}</option>))}
        </select>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 5, marginBottom: 10, fontSize: 11, color: "#EF4444" }}>
          <AlertTriangle size={12} /><span>{error}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleRun} disabled={loading}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", background: loading ? "#EFF6FF" : "#2563EB", border: "none", borderRadius: 6, color: loading ? "#2563EB" : "#FFFFFF", fontSize: 12, fontWeight: 600, cursor: loading ? "wait" : "pointer", transition: "all 0.15s ease" }}>
          {loading ? (<><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />Running…</>) : (<><Play size={13} />Run Simulation</>)}
        </button>
        {hasSimulation && (
          <button onClick={onClearSimulation} title="Reset simulation"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", background: "#F8FAFC", border: "1px solid #D9E0E7", borderRadius: 6, color: "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s ease" }}>
            <RotateCcw size={13} />Reset
          </button>
        )}
      </div>
    </div>
  );
}