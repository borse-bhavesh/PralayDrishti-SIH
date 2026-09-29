import { useState, useMemo } from "react";
import { AlertCircle, Navigation, GitCompare, RefreshCcw } from "lucide-react";
import type {
  GeoLayerState,
  SimulationResponse,
  RoutingResponse,
  CompareResponse,
  RoutingMode,
  SimulationScenario,
} from "../../types";
import { SCENARIO_LABELS } from "../../types";
import { API_BASE_URL } from "../../config/api";

interface RoutingControlProps {
  layers: GeoLayerState[];
  simulationData: SimulationResponse | null;
  currentTimelineStep: number;
  onRoutingResult: (data: RoutingResponse) => void;
  onCompareResult: (data: CompareResponse) => void;
  onClearRouting: () => void;
  routeIsOutdated: boolean;
}

export function RoutingControl({
  layers,
  simulationData,
  currentTimelineStep,
  onRoutingResult,
  onCompareResult,
  onClearRouting,
  routeIsOutdated,
}: RoutingControlProps) {
  const [startRoad, setStartRoad] = useState<string>("");
  const [endRoad, setEndRoad] = useState<string>("");
  const [routingMode, setRoutingMode] = useState<RoutingMode>("safest");
  const [isCompare, setIsCompare] = useState<boolean>(false);
  const [scenarioB, setScenarioB] = useState<SimulationScenario>("normal");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract road options from the roads layer
  const roadsOptions = useMemo(() => {
    const roadsLayer = layers.find((l) => l.id === "roads");
    if (!roadsLayer || !roadsLayer.data) return [];

    return roadsLayer.data.features.map((f, idx) => {
      const name = f.properties?.name || "";
      const road_id = name
        ? "road_" + name.toLowerCase().replace(/ /g, "_").replace(/–/g, "_").replace(/\//g, "_").substring(0, 40)
        : `road_${idx.toString().padStart(3, "0")}`;
      return { id: road_id, name: name || `Road ${idx + 1}` };
    });
  }, [layers]);

  const handleCalculate = async () => {
    if (!simulationData) return;
    if (!startRoad || !endRoad) {
      setError("Please select both start and end roads.");
      return;
    }
    if (startRoad === endRoad) {
      setError("Start and destination roads cannot be the same.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isCompare) {
        const payload = {
          start_road_id: startRoad,
          end_road_id: endRoad,
          time_minutes: currentTimelineStep,
          routing_mode: routingMode,
          rainfall_intensity_mm_hr: simulationData.rainfall_intensity_mm_hr,
          duration_minutes: simulationData.duration_minutes,
          scenario_a: simulationData.scenario,
          scenario_b: scenarioB,
          drainage_condition: simulationData.drainage_condition,
        };

        const res = await fetch(`${API_BASE_URL}/api/routing/compare`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Failed to compare routes");
        }

        const data: CompareResponse = await res.json();
        onCompareResult(data);
      } else {
        const payload = {
          start_road_id: startRoad,
          end_road_id: endRoad,
          time_minutes: currentTimelineStep,
          routing_mode: routingMode,
          rainfall_intensity_mm_hr: simulationData.rainfall_intensity_mm_hr,
          duration_minutes: simulationData.duration_minutes,
          scenario: simulationData.scenario,
          drainage_condition: simulationData.drainage_condition,
        };

        const res = await fetch(`${API_BASE_URL}/api/routing/route`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Failed to calculate route");
        }

        const data: RoutingResponse = await res.json();
        onRoutingResult(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Navigation size={18} color="#10b981" />
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>
          Flood-Aware Routing
        </h3>
      </div>

      {!simulationData ? (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            padding: "10px",
            borderRadius: 8,
            fontSize: 12,
            color: "#fca5a5",
          }}
        >
          Run a flood simulation before calculating a flood-aware route.
        </div>
      ) : (
        <>
          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11, color: "#94a3b8" }}>Start Road</label>
            <select
              value={startRoad}
              onChange={(e) => setStartRoad(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select Start Road...</option>
              {roadsOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <label style={{ fontSize: 11, color: "#94a3b8" }}>Destination Road</label>
            <select
              value={endRoad}
              onChange={(e) => setEndRoad(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select Destination Road...</option>
              {roadsOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <label style={{ fontSize: 11, color: "#94a3b8" }}>Routing Mode</label>
            <select
              value={routingMode}
              onChange={(e) => setRoutingMode(e.target.value as RoutingMode)}
              style={inputStyle}
            >
              <option value="shortest">Shortest (Distance only)</option>
              <option value="safest">Safest (Avoids high risk)</option>
              <option value="emergency">Emergency (Strictly avoids severe)</option>
            </select>

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#e2e8f0", marginTop: 4 }}>
              <input
                type="checkbox"
                checked={isCompare}
                onChange={(e) => setIsCompare(e.target.checked)}
              />
              Compare with Scenario
            </label>

            {isCompare && (
              <>
                <label style={{ fontSize: 11, color: "#94a3b8" }}>Compare Against</label>
                <select
                  value={scenarioB}
                  onChange={(e) => setScenarioB(e.target.value as SimulationScenario)}
                  style={inputStyle}
                >
                  {Object.entries(SCENARIO_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {error && (
            <div style={{ fontSize: 11, color: "#fca5a5", display: "flex", alignItems: "center", gap: 4 }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {routeIsOutdated && (
            <div style={{ fontSize: 11, color: "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}>
              <AlertCircle size={14} />
              Timeline changed. Route is outdated.
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={handleCalculate}
              disabled={loading}
              style={{
                flex: 1,
                background: routeIsOutdated ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.15)",
                border: `1px solid ${routeIsOutdated ? "rgba(245, 158, 11, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
                color: routeIsOutdated ? "#fbbf24" : "#34d399",
                padding: "8px 0",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.2s",
              }}
            >
              {loading ? (
                "Calculating..."
              ) : routeIsOutdated ? (
                <>
                  <RefreshCcw size={14} /> Recalculate
                </>
              ) : isCompare ? (
                <>
                  <GitCompare size={14} /> Compare
                </>
              ) : (
                "Calculate Route"
              )}
            </button>
            <button
              onClick={onClearRouting}
              style={{
                background: "rgba(148, 163, 184, 0.1)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                color: "#cbd5e1",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "rgba(15, 23, 42, 0.6)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: 6,
  padding: "6px 10px",
  color: "#f8fafc",
  fontSize: 12,
  outline: "none",
};
