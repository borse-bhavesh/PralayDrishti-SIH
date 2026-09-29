import type { GeoLayerState, RoutingResponse, CompareResponse } from "../../types";
import { RISK_COLORS } from "../../types";

interface MapLegendProps {
  layers: GeoLayerState[];
  routingData?: RoutingResponse | null;
  comparisonData?: CompareResponse | null;
}

export function MapLegend({ layers, routingData, comparisonData }: MapLegendProps) {
  return (
    <div className="animate-fade-in" style={{ background: "#FFFFFF", border: "1px solid #D9E0E7", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", borderRadius: 8, padding: "12px 16px", width: 300 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94A3B8", marginBottom: 8 }}>Map Layers</div>
      {layers.map((l) => (
        <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
          <span style={{ width: 10, height: 10, borderRadius: l.id === "roads" ? 2 : "50%", background: l.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#1F2937" }}>{l.label}</span>
          {l.data && <span style={{ marginLeft: "auto", fontSize: 10, color: "#94A3B8" }}>{l.data.features.length}</span>}
        </div>
      ))}
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94A3B8", marginTop: 10, marginBottom: 6 }}>Flood Risk</div>
      {Object.entries(RISK_COLORS).map(([risk, color]) => (
        <div key={risk} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
          <span style={{ width: 10, height: 3, background: color, flexShrink: 0, borderRadius: 1 }} />
          <span style={{ fontSize: 11, color: "#1F2937", textTransform: "capitalize" }}>{risk}</span>
        </div>
      ))}
      {(routingData || comparisonData) && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94A3B8", marginTop: 10, marginBottom: 6 }}>Routing</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
            <span style={{ width: 10, height: 3, background: "#10b981", flexShrink: 0 }} /><span style={{ fontSize: 11, color: "#1F2937" }}>Safe Route</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
            <span style={{ width: 10, height: 3, background: "#a855f7", flexShrink: 0 }} /><span style={{ fontSize: 11, color: "#1F2937" }}>Alternative</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
            <span style={{ width: 10, height: 3, background: "#ef4444", flexShrink: 0 }} /><span style={{ fontSize: 11, color: "#1F2937" }}>High-Risk</span>
          </div>
        </>
      )}
    </div>
  );
}