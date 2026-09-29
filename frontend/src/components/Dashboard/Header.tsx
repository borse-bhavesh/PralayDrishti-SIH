import { useEffect, useState } from "react";
import { Droplets, MapPin, Bell, Activity } from "lucide-react";

export function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = time.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const formattedTime = time.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header
      style={{
        height: 52,
        minHeight: 52,
        background: "#FFFFFF",
        borderBottom: "1px solid #D9E0E7",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        zIndex: 20,
      }}
    >
      {/* Left - Branding */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            background: "#2563EB",
            borderRadius: 6,
            padding: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Droplets size={16} color="#FFFFFF" strokeWidth={2.5} />
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "#1F2937",
            }}
          >
            PralayDrishti
          </h1>
          <span style={{ fontSize: 10, color: "#64748B", letterSpacing: "0.02em" }}>
            Urban Flood Nowcasting
          </span>
        </div>
      </div>

      {/* Center - Location */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#64748B",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <MapPin size={14} color="#2563EB" />
        <span>Mumbai — Mithi River Catchment</span>
      </div>

      {/* Right - Status + Time */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Activity size={12} color="#16A34A" />
          <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 500 }}>Online</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#1F2937",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formattedTime}
          </div>
          <div style={{ fontSize: 10, color: "#94A3B8" }}>{formattedDate}</div>
        </div>
        <button
          title="Notifications"
          style={{
            background: "#F8FAFC",
            border: "1px solid #D9E0E7",
            borderRadius: 6,
            padding: 7,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748B",
            position: "relative",
          }}
        >
          <Bell size={15} />
          <span
            style={{
              position: "absolute",
              top: 5,
              right: 5,
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#16A34A",
            }}
          />
        </button>
      </div>
    </header>
  );
}