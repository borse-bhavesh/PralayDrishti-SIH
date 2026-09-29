import { Layers, Eye, EyeOff, Loader2 } from "lucide-react";
import type { GeoLayerState } from "../../types";

interface LayerControlProps {
  layers: GeoLayerState[];
  onToggleLayer: (id: string) => void;
}

export function LayerControl({ layers, onToggleLayer }: LayerControlProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Layers size={13} color="#64748B" />
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B" }}>Map Layers</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {layers.map((layer) => (
          <button key={layer.id} onClick={() => onToggleLayer(layer.id)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: layer.visible ? "#F8FAFC" : "#FFFFFF", border: `1px solid ${layer.visible ? "#D9E0E7" : "#E8ECF0"}`, borderRadius: 5, cursor: "pointer", transition: "all 0.15s ease", width: "100%", textAlign: "left", color: "inherit" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: layer.color, opacity: layer.visible ? 1 : 0.3, flexShrink: 0, transition: "opacity 0.15s ease" }} />
            <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: layer.visible ? "#1F2937" : "#94A3B8" }}>{layer.label}</span>
            {layer.loading ? (
              <Loader2 size={13} color="#2563EB" style={{ animation: "spin 1s linear infinite" }} />
            ) : layer.error ? (
              <span style={{ fontSize: 10, color: "#EF4444", fontWeight: 500 }}>err</span>
            ) : layer.data ? (
              <span style={{ fontSize: 10, color: "#94A3B8" }}>{layer.data.features.length}</span>
            ) : null}
            {layer.visible ? <Eye size={13} color="#2563EB" /> : <EyeOff size={13} color="#CBD5E1" />}
          </button>
        ))}
      </div>
    </div>
  );
}