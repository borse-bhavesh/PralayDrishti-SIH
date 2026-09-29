import { Building, ShieldCheck, ShieldAlert, XCircle } from "lucide-react";
import type { InfraImpact } from "../../types";

interface InfrastructureImpactProps {
  facilities: InfraImpact[];
}

export function InfrastructureImpact({ facilities }: InfrastructureImpactProps) {
  if (!facilities || facilities.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <Building size={12} color="#8b5cf6" />
        CRITICAL INFRASTRUCTURE
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto", paddingRight: 4 }}>
        {facilities.map(fac => {
          const isSafe = fac.accessibility === "SAFE";
          const isAtRisk = fac.accessibility === "AT RISK";
          
          return (
            <div key={fac.facility_id} style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              background: "rgba(30,41,59,0.4)",
              padding: "8px 10px",
              borderRadius: 8,
              border: `1px solid ${isSafe ? "rgba(16,185,129,0.15)" : isAtRisk ? "rgba(245,158,11,0.2)" : "rgba(244,63,94,0.2)"}`
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isSafe ? <ShieldCheck size={14} color="#10b981" /> : 
                 isAtRisk ? <ShieldAlert size={14} color="#f59e0b" /> : 
                 <XCircle size={14} color="#f43f5e" />}
                <div style={{ fontSize: 11, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
                  {fac.name}
                </div>
              </div>
              
              <div style={{ 
                fontSize: 9, 
                fontWeight: 700,
                color: isSafe ? "#10b981" : isAtRisk ? "#f59e0b" : "#f43f5e"
              }}>
                {fac.accessibility}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
