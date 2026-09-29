import { useState, useEffect } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Droplets,
} from "lucide-react";
import { LayerControl } from "./LayerControl";
import { SystemStatus } from "./SystemStatus";
import { SimulationControl } from "./SimulationControl";
import { RoutingControl } from "./RoutingControl";
import type { GeoLayerState, SimulationResponse, RoutingResponse, CompareResponse } from "../../types";
import { API_BASE_URL } from "../../config/api";

interface SidebarProps {
  layers: GeoLayerState[];
  onToggleLayer: (id: string) => void;
  onSimulationResult: (data: SimulationResponse) => void;
  onClearSimulation: () => void;
  hasSimulation: boolean;
  simulationData: SimulationResponse | null;
  currentTimelineStep: number;
  onRoutingResult: (data: RoutingResponse) => void;
  onCompareResult: (data: CompareResponse) => void;
  onClearRouting: () => void;
  routeIsOutdated: boolean;
}

export function Sidebar({
  layers,
  onToggleLayer,
  onSimulationResult,
  onClearSimulation,
  hasSimulation,
  simulationData,
  currentTimelineStep,
  onRoutingResult,
  onCompareResult,
  onClearRouting,
  routeIsOutdated,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`)
      .then((res) => { setApiHealthy(res.ok); })
      .catch(() => setApiHealthy(false));
  }, []);

  const totalFeatures = layers.reduce(
    (sum, l) => sum + (l.data?.features.length ?? 0),
    0
  );

  return (
    <aside
      style={{
        width: collapsed ? 48 : 300,
        minWidth: collapsed ? 48 : 300,
        height: "100%",
        background: "#FFFFFF",
        borderRight: "1px solid #D9E0E7",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease, min-width 0.2s ease",
        overflow: "hidden",
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expand" : "Collapse"}
        style={{
          position: "absolute",
          top: 12,
          right: collapsed ? "50%" : 10,
          transform: collapsed ? "translateX(50%)" : "none",
          zIndex: 20,
          background: "#F8FAFC",
          border: "1px solid #D9E0E7",
          borderRadius: 5,
          color: "#64748B",
          cursor: "pointer",
          padding: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {!collapsed && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            padding: "14px 14px",
            gap: 16,
            overflowY: "auto",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 24 }}>
            <div
              style={{
                background: "#2563EB",
                borderRadius: 6,
                padding: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Droplets size={18} color="#FFFFFF" />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#1F2937",
                }}
              >
                PralayDrishti
              </h2>
              <span style={{ fontSize: 10, color: "#94A3B8" }}>
                Urban Flood Nowcasting
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <StatCard label="Layers" value={layers.filter((l) => l.visible).length} total={layers.length} />
            <StatCard label="Features" value={totalFeatures} />
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #E8ECF0", margin: 0 }} />

          <SimulationControl
            onSimulationResult={onSimulationResult}
            onClearSimulation={onClearSimulation}
            hasSimulation={hasSimulation}
          />

          <hr style={{ border: "none", borderTop: "1px solid #E8ECF0", margin: 0 }} />

          <RoutingControl
            layers={layers}
            simulationData={simulationData}
            currentTimelineStep={currentTimelineStep}
            onRoutingResult={onRoutingResult}
            onCompareResult={onCompareResult}
            onClearRouting={onClearRouting}
            routeIsOutdated={routeIsOutdated}
          />

          <hr style={{ border: "none", borderTop: "1px solid #E8ECF0", margin: 0 }} />

          <LayerControl layers={layers} onToggleLayer={onToggleLayer} />

          <div style={{ flex: 1 }} />

          <SystemStatus
            apiHealthy={apiHealthy}
            layersLoading={layers.some((l) => l.loading)}
            layersWithErrors={layers.filter((l) => l.error !== null).length}
          />
        </div>
      )}

      {collapsed && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 48,
            gap: 14,
          }}
        >
          <Droplets size={18} color="#2563EB" />
          <Activity size={16} color="#94A3B8" />
        </div>
      )}
    </aside>
  );
}

function StatCard({ label, value, total }: { label: string; value: number; total?: number }) {
  return (
    <div
      style={{
        background: "#F8FAFC",
        border: "1px solid #E8ECF0",
        borderRadius: 6,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 2, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#1F2937" }}>
        {value}
        {total !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 400, color: "#94A3B8" }}>
            /{total}
          </span>
        )}
      </div>
    </div>
  );
}