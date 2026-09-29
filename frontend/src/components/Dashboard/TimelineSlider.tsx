import { Clock, AlertTriangle } from "lucide-react";

interface TimelineSliderProps {
  timeSteps: number[];
  currentStep: number;
  onChange: (step: number) => void;
}

export function TimelineSlider({ timeSteps, currentStep, onChange }: TimelineSliderProps) {
  const currentIndex = timeSteps.indexOf(currentStep);

  return (
    <div
      className="animate-fade-in"
      style={{
        position: "absolute",
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        background: "#FFFFFF",
        border: "1px solid #D9E0E7",
        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
        borderRadius: 8,
        padding: "12px 20px",
        minWidth: 400,
        maxWidth: 560,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={12} color="#2563EB" />
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B" }}>Simulation Timeline</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <AlertTriangle size={10} color="#F59E0B" />
          <span style={{ fontSize: 9, color: "#F59E0B", fontStyle: "italic" }}>Simulated</span>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={timeSteps.length - 1}
        step={1}
        value={currentIndex >= 0 ? currentIndex : 0}
        onChange={(e) => onChange(timeSteps[Number(e.target.value)])}
        style={{ width: "100%", accentColor: "#2563EB" }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        {timeSteps.map((t) => (
          <span key={t} style={{ fontSize: 10, fontWeight: t === currentStep ? 700 : 400, color: t === currentStep ? "#2563EB" : "#94A3B8", transition: "all 0.15s ease" }}>
            {t === 0 ? "0m" : t < 60 ? `${t}m` : `${t / 60}h`}
          </span>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 6, fontSize: 12, fontWeight: 600, color: "#1F2937" }}>
        T + {currentStep} min
        {currentStep >= 60 && (
          <span style={{ color: "#94A3B8", fontWeight: 400 }}> ({(currentStep / 60).toFixed(1)} hrs)</span>
        )}
      </div>
    </div>
  );
}