import { MapPin, Target, Zap } from "lucide-react";
import type { Hotspot, Explanation, Recommendation } from "../../types";
import { RISK_COLORS } from "../../types";

interface HotspotPanelProps {
  hotspot: Hotspot | null;
  explanation: Explanation | null;
  recommendations: Recommendation[];
}

export function HotspotPanel({ hotspot, explanation, recommendations }: HotspotPanelProps) {
  const P: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #D9E0E7", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", borderRadius: 8, padding: "14px 16px", width: 300, display: "flex", flexDirection: "column", gap: 10 };

  if (!hotspot) {
    return (
      <div style={P}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Target size={14} color="#94A3B8" />
          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>Hotspot Details</h3>
        </div>
        <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", padding: "16px 0" }}>Select a hotspot to view details</div>
      </div>
    );
  }

  const relatedRecs = recommendations.filter(r => r.location === hotspot.road_name);

  return (
    <div style={P}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Target size={14} color="#EF4444" />
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#1F2937", textTransform: "uppercase", letterSpacing: "0.04em" }}>Hotspot Details</h3>
      </div>

      <div style={{ background: "#F8FAFC", padding: 10, borderRadius: 5, border: `1px solid ${RISK_COLORS[hotspot.risk_level]}30` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
          <MapPin size={12} color="#2563EB" />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#1F2937" }}>{hotspot.road_name}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
          <div><span style={{ color: "#94A3B8" }}>Risk: </span><span style={{ color: RISK_COLORS[hotspot.risk_level], fontWeight: 700, textTransform: "uppercase" }}>{hotspot.risk_level}</span></div>
          <div><span style={{ color: "#94A3B8" }}>Depth: </span><span style={{ color: "#1F2937", fontWeight: 600 }}>{hotspot.water_depth_m.toFixed(2)} m</span></div>
          <div><span style={{ color: "#94A3B8" }}>Arrival: </span><span style={{ color: "#1F2937", fontWeight: 600 }}>T+{hotspot.arrival_time_minutes} min</span></div>
        </div>
      </div>

      {explanation && (
        <div>
          <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600, marginBottom: 3, textTransform: "uppercase" }}>Cause</div>
          <div style={{ fontSize: 11, color: "#1F2937" }}>
            <span style={{ color: "#EF4444", fontWeight: 600 }}>{explanation.primary_cause}</span>
            {explanation.contributing_factors.length > 0 && (
              <span style={{ color: "#64748B" }}> ({explanation.contributing_factors.join(", ")})</span>
            )}
          </div>
        </div>
      )}

      {relatedRecs.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600, marginBottom: 3, textTransform: "uppercase" }}>Recommended Action</div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-start", background: "#F0FDF4", padding: 8, borderRadius: 5, border: "1px solid #BBF7D0" }}>
            <Zap size={12} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: "#16A34A", fontWeight: 600 }}>{relatedRecs[0].action}</div>
          </div>
        </div>
      )}
    </div>
  );
}