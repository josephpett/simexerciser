import React, { useEffect, useState } from "react";
import { parsePhases } from "../constants";

type ScenarioStructurePanelProps = {
  phases: string[];
  onUpdatePhases: (phases: string[]) => void;
  disabled?: boolean;
};

export default function ScenarioStructurePanel({
  phases,
  onUpdatePhases,
  disabled,
}: ScenarioStructurePanelProps) {
  const [raw, setRaw] = useState<string>(phases.join(", "));

  useEffect(() => {
    const parsedRaw = parsePhases(raw);
    const parsedPhases = parsePhases(phases.join(", "));
    if (parsedRaw.join("|") !== parsedPhases.join("|")) {
      setRaw(phases.join(", "));
    }
  }, [phases]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRaw(value);
    if (disabled) return;
    onUpdatePhases(parsePhases(value));
  };

  return (
    <div
      style={{
        marginBottom: 12,
        padding: 10,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
        display: "grid",
        gap: 6,
        opacity: disabled ? 0.8 : 1,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Scenario structure</span>
        <span style={{ fontSize: 11, color: "#6b7280" }}>
          (phases in order)
        </span>
      </div>
      <textarea
        placeholder="Phases in order (e.g. Detection, Escalation, Response)"
        value={raw}
        onChange={handleChange}
        rows={2}
        style={{
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          padding: "6px 10px",
          fontSize: 12,
          backgroundColor: disabled ? "#f9fafb" : "white",
        }}
        disabled={disabled}
      />
      {phases.length > 0 && (
        <div style={{ fontSize: 11, color: "#4b5563" }}>
          Current phases: {" "}
          {phases.map((p, idx) => (
            <span
              key={p + idx}
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid #d1d5db",
                marginRight: 4,
                marginBottom: 2,
                background: "white",
              }}
            >
              {idx + 1}. {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
