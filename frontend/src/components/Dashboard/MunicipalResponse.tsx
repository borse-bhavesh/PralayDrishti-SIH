import { Shield, AlertTriangle, Zap, CheckCircle2 } from "lucide-react";
import type { DecisionResponse } from "../../types";
import { DrainageHealth } from "./DrainageHealth";
import { InfrastructureImpact } from "./InfrastructureImpact";

interface MunicipalResponseProps { decision: DecisionResponse | null; }

export function MunicipalResponse({ decision }: MunicipalResponseProps) {
  const P: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #D9E0E7", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", borderRadius: 8, padding: "14px 16px", width: 300, display: "flex", flexDirection: "column", gap: 10, maxHeight: "60vh", overflowY: "auto" };

  if (!decision) {
    return (
      <div style={P}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Shield size={14} color="#94A3B8" />
          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>Municipal Response</h3>
        </div>
        <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", padding: "16px 0" }}>Awaiting simulation</div>
      </div>
    );
  }

  const criticalHotspots = decision.hotspots.filter(h => h.priority === "critical").length;
  const highRiskRoads = decision.hotspots.filter(h => h.risk_level === "high" || h.risk_level === "severe").length;
  const drainageAlerts = decision.drainage_health.filter(d => d.status !== "NORMAL").length;
  const facilitiesAtRisk = decision.critical_infrastructure.filter(i => i.accessibility !== "SAFE").length;

  return (
    <div style={P}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Shield size={14} color="#2563EB" />
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#1F2937", textTransform: "uppercase", letterSpacing: "0.04em" }}>Municipal Response</h3>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <SummaryBadge icon={<AlertTriangle size={11} color="#EF4444" />} label="Critical Hotspots" value={criticalHotspots} />
        <SummaryBadge icon={<AlertTriangle size={11} color="#F59E0B" />} label="High-Risk Roads" value={highRiskRoads} />
        <SummaryBadge icon={<Zap size={11} color="#2563EB" />} label="Drainage Alerts" value={drainageAlerts} />
        <SummaryBadge icon={<Shield size={11} color="#7C3AED" />} label="At-Risk Facilities" value={facilitiesAtRisk} />
      </div>

      {decision.recommendations.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Priority Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {decision.recommendations.slice(0, 3).map((rec, i) => (
              <div key={i} style={{ background: rec.priority === "CRITICAL" ? "#FEF2F2" : "#F8FAFC", border: `1px solid ${rec.priority === "CRITICAL" ? "#FECACA" : "#E8ECF0"}`, padding: "8px 10px", borderRadius: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: rec.priority === "CRITICAL" ? "#EF4444" : rec.priority === "HIGH" ? "#F59E0B" : "#2563EB" }}>{rec.priority}</div>
                  <div style={{ fontSize: 9, color: "#94A3B8" }}>{rec.urgency}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#1F2937", marginBottom: 2 }}>{rec.action}</div>
                <div style={{ fontSize: 10, color: "#64748B" }}>{rec.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {decision.recommendations.length === 0 && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", background: "#F0FDF4", padding: "8px 10px", borderRadius: 5, border: "1px solid #BBF7D0" }}>
          <CheckCircle2 size={14} color="#16A34A" />
          <span style={{ fontSize: 11, color: "#16A34A" }}>No priority actions required at this time.</span>
        </div>
      )}

      <DrainageHealth nodes={decision.drainage_health} />
      <InfrastructureImpact facilities={decision.critical_infrastructure} />

      <div style={{ fontSize: 9, color: "#94A3B8", textAlign: "center", fontStyle: "italic" }}>
        Prototype Recommendation — Not for real-world operations
      </div>
    </div>
  );
}

function SummaryBadge({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", padding: "7px 9px", borderRadius: 5, border: "1px solid #E8ECF0" }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1F2937" }}>{value}</div>
        <div style={{ fontSize: 8, color: "#94A3B8", whiteSpace: "nowrap" }}>{label}</div>
      </div>
    </div>
  );
}