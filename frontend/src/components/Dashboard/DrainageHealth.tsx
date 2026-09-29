import { Droplets } from "lucide-react";
import type { DrainageNodeHealth } from "../../types";

interface DrainageHealthProps { nodes: DrainageNodeHealth[]; }

export function DrainageHealth({ nodes }: DrainageHealthProps) {
  if (!nodes || nodes.length === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        <Droplets size={10} color="#2563EB" /> Drainage Health
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto", paddingRight: 4 }}>
        {nodes.map(node => (
          <div key={node.node_id} style={{ background: "#F8FAFC", padding: "7px 9px", borderRadius: 5, border: "1px solid #E8ECF0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#1F2937" }}>{node.node_id}</div>
              <div style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                background: node.status === "FAILED" || node.status === "BLOCKED" ? "#FEF2F2" : node.status === "OVERLOADED" ? "#FFFBEB" : node.status === "WARNING" ? "#FFFBEB" : "#F0FDF4",
                color: node.status === "FAILED" || node.status === "BLOCKED" ? "#EF4444" : node.status === "OVERLOADED" ? "#F59E0B" : node.status === "WARNING" ? "#D97706" : "#16A34A"
              }}>{node.status}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ flex: 1, height: 3, background: "#E8ECF0", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${node.utilization_pct}%`,
                  background: node.utilization_pct > 95 ? "#EF4444" : node.utilization_pct > 80 ? "#F59E0B" : "#2563EB",
                  transition: "width 0.3s ease"
                }} />
              </div>
              <div style={{ fontSize: 9, color: "#94A3B8", width: 24, textAlign: "right" }}>{node.utilization_pct}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}