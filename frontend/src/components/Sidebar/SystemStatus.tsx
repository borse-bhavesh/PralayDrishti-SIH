import { Wifi, WifiOff, AlertTriangle, CheckCircle2 } from "lucide-react";

interface SystemStatusProps {
  apiHealthy: boolean | null;
  layersLoading: boolean;
  layersWithErrors: number;
}

export function SystemStatus({ apiHealthy, layersLoading, layersWithErrors }: SystemStatusProps) {
  return (
    <div style={{ background: "#F8FAFC", border: "1px solid #E8ECF0", borderRadius: 6, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94A3B8", marginBottom: 10 }}>System Status</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <StatusRow
          icon={apiHealthy ? <Wifi size={13} color="#16A34A" /> : apiHealthy === false ? <WifiOff size={13} color="#EF4444" /> : <Wifi size={13} color="#94A3B8" />}
          label="API Connection"
          value={apiHealthy ? "Connected" : apiHealthy === false ? "Disconnected" : "Checking…"}
          valueColor={apiHealthy ? "#16A34A" : apiHealthy === false ? "#EF4444" : "#94A3B8"}
        />
        <StatusRow
          icon={layersWithErrors > 0 ? <AlertTriangle size={13} color="#F59E0B" /> : <CheckCircle2 size={13} color="#16A34A" />}
          label="Data Layers"
          value={layersLoading ? "Loading…" : layersWithErrors > 0 ? `${layersWithErrors} error(s)` : "All loaded"}
          valueColor={layersLoading ? "#F59E0B" : layersWithErrors > 0 ? "#F59E0B" : "#16A34A"}
        />
      </div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
        <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94A3B8", background: "#FFFFFF", border: "1px solid #E8ECF0", borderRadius: 4, padding: "3px 8px" }}>Prototype v0.1</span>
      </div>
    </div>
  );
}

function StatusRow({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string; valueColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icon}
      <span style={{ flex: 1, fontSize: 11, color: "#64748B" }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  );
}