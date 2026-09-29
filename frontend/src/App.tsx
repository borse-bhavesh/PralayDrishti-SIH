import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { Header } from "./components/Dashboard/Header";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { MapView } from "./components/Map/MapView";
import { LAYERS } from "./config/mapConfig";
import type { GeoLayerState, SimulationResponse, RoutingResponse, CompareResponse } from "./types";
import { TimelineSlider } from "./components/Dashboard/TimelineSlider";
import { SimulationSummary } from "./components/Dashboard/SimulationSummary";
import { RouteSummary } from "./components/Dashboard/RouteSummary";
import { MunicipalResponse } from "./components/Dashboard/MunicipalResponse";
import { HotspotPanel } from "./components/Dashboard/HotspotPanel";
import { MapLegend } from "./components/Map/MapLegend";
import type { DecisionResponse } from "./types";
import { API_BASE_URL } from "./config/api";

function App() {
  /* ── Layer state ───────────────────────────────────────────────── */
  const [layers, setLayers] = useState<GeoLayerState[]>(
    LAYERS.map((def) => ({
      id: def.id,
      label: def.label,
      color: def.color,
      visible: def.defaultVisible,
      data: null,
      loading: false,
      error: null,
    }))
  );

  /* ── Simulation state ──────────────────────────────────────────── */
  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);
  const [currentTimelineStep, setCurrentTimelineStep] = useState<number>(0);
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null);

  /* ── Decision state ────────────────────────────────────────────── */
  const [decisionData, setDecisionData] = useState<DecisionResponse | null>(null);

  /* ── Routing state ─────────────────────────────────────────────── */
  const [routingData, setRoutingData] = useState<RoutingResponse | null>(null);
  const [comparisonData, setComparisonData] = useState<CompareResponse | null>(null);
  const [routeIsOutdated, setRouteIsOutdated] = useState(false);

  const handleRoutingResult = useCallback((data: RoutingResponse) => {
    setRoutingData(data);
    setComparisonData(null);
    setRouteIsOutdated(false);
  }, []);

  const handleCompareResult = useCallback((data: CompareResponse) => {
    setComparisonData(data);
    setRoutingData(null);
    setRouteIsOutdated(false);
  }, []);

  const handleClearRouting = useCallback(() => {
    setRoutingData(null);
    setComparisonData(null);
    setRouteIsOutdated(false);
  }, []);

  const handleTimelineChange = useCallback((step: number) => {
    setCurrentTimelineStep(step);
    if (routingData || comparisonData) {
      setRouteIsOutdated(true);
    }
  }, [routingData, comparisonData]);

  const handleSimulationResult = useCallback((data: SimulationResponse) => {
    setSimulationData(data);
    setCurrentTimelineStep(0);
    setSelectedRoadId(null);
    handleClearRouting();
  }, [handleClearRouting]);

  const handleClearSimulation = useCallback(() => {
    setSimulationData(null);
    setCurrentTimelineStep(0);
    setSelectedRoadId(null);
    setDecisionData(null);
    handleClearRouting();
  }, [handleClearRouting]);

  /* ── Fetch Decision Intelligence ───────────────────────────────── */
  useEffect(() => {
    if (!simulationData) {
      setDecisionData(null);
      return;
    }

    const fetchDecision = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/decision/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rainfall_intensity_mm_hr: simulationData.rainfall_intensity_mm_hr,
            duration_minutes: simulationData.duration_minutes,
            drainage_condition: simulationData.drainage_condition,
            scenario: simulationData.scenario,
            time_minutes: currentTimelineStep,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setDecisionData(data);
        }
      } catch (err) {
        console.error("Failed to fetch decision data", err);
      }
    };
    fetchDecision();
  }, [simulationData, currentTimelineStep]);

  /* ── Fetch all layers on mount ─────────────────────────────────── */
  useEffect(() => {
    LAYERS.forEach((def) => {
      setLayers((prev) =>
        prev.map((l) => (l.id === def.id ? { ...l, loading: true } : l))
      );

      fetch(`${API_BASE_URL}/api/geodata/${def.id}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setLayers((prev) =>
            prev.map((l) =>
              l.id === def.id
                ? { ...l, data, loading: false, error: null }
                : l
            )
          );
        })
        .catch((err) => {
          setLayers((prev) =>
            prev.map((l) =>
              l.id === def.id
                ? { ...l, loading: false, error: err.message }
                : l
            )
          );
        });
    });
  }, []);

  /* ── Toggle layer visibility ───────────────────────────────────── */
  const handleToggleLayer = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  }, []);

  return (
    <div className="app-layout">
      <Header />
      <div className="app-body">
        <Sidebar
          layers={layers}
          onToggleLayer={handleToggleLayer}
          onSimulationResult={handleSimulationResult}
          onClearSimulation={handleClearSimulation}
          hasSimulation={!!simulationData}
          simulationData={simulationData}
          currentTimelineStep={currentTimelineStep}
          onRoutingResult={handleRoutingResult}
          onCompareResult={handleCompareResult}
          onClearRouting={handleClearRouting}
          routeIsOutdated={routeIsOutdated}
        />
        <div style={{ position: "relative", flex: 1 }}>
          <MapView
            layers={layers}
            simulationData={simulationData}
            currentTimelineStep={currentTimelineStep}
            routingData={routingData}
            comparisonData={comparisonData}
          />
          <TimelineSlider
            timeSteps={simulationData?.time_steps || [0, 30, 60, 90, 120, 150, 180]}
            currentStep={currentTimelineStep}
            onChange={handleTimelineChange}
          />
          
          {/* Right Side Floating Panels */}
          <div
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              pointerEvents: "none",
              height: "calc(100vh - 32px)",
              overflowY: "auto",
              paddingRight: 8
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
              <SimulationSummary
                simulation={simulationData}
                currentTimeStep={currentTimelineStep}
                onSelectRoad={setSelectedRoadId}
                selectedRoadId={selectedRoadId}
              />
            </div>
            <div style={{ pointerEvents: "auto" }}>
              <RouteSummary
                routingData={routingData}
                comparisonData={comparisonData}
                isOutdated={routeIsOutdated}
              />
            </div>
            <div style={{ pointerEvents: "auto" }}>
              <MunicipalResponse decision={decisionData} />
            </div>
            <div style={{ pointerEvents: "auto" }}>
              <HotspotPanel 
                hotspot={decisionData?.hotspots?.find(h => h.road_id === selectedRoadId) || null}
                explanation={decisionData?.explanations?.[0] || null}
                recommendations={decisionData?.recommendations || []}
              />
            </div>
            <div style={{ pointerEvents: "auto" }}>
              <MapLegend 
                layers={layers.filter((l) => l.visible)} 
                routingData={routingData} 
                comparisonData={comparisonData} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
