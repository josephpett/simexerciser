import React from "react";
import { WorldState } from "../types";

type ScenarioStatePanelProps = {
  worldState: WorldState;
  onUpdateWorldState: (patch: Partial<WorldState>) => void;
  disabled?: boolean;
};

export default function ScenarioStatePanel({
  worldState,
  onUpdateWorldState,
  disabled,
}: ScenarioStatePanelProps) {
  const epiTrend = worldState.epiTrend || "stable";
  const commsPressure =
    typeof worldState.commsPressure === "number"
      ? worldState.commsPressure
      : 3;
  const labBacklog =
    typeof worldState.labBacklog === "number" ? worldState.labBacklog : 3;
  const publicAnxiety =
    typeof worldState.publicAnxiety === "number" ? worldState.publicAnxiety : 3;

  const disabledStyle = disabled ? { opacity: 0.7 } : {};

  return (
    <div
      style={{
        marginBottom: 12,
        padding: 10,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
        display: "grid",
        gap: 8,
        ...disabledStyle,
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
        <span>Scenario state</span>
        <span style={{ fontSize: 11, color: "#6b7280" }}>
          (for future branching)
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: "1.1fr 1fr",
          alignItems: "center",
        }}
      >
        <label style={{ fontSize: 12 }}>
          Epidemiological trend
          <select
            value={epiTrend}
            onChange={(e) =>
              !disabled &&
              onUpdateWorldState({
                epiTrend: e.target.value as WorldState["epiTrend"],
              })
            }
            style={{
              marginTop: 4,
              borderRadius: 999,
              border: "1px solid #d1d5db",
              padding: "4px 10px",
              fontSize: 12,
              width: "100%",
              backgroundColor: disabled ? "#f9fafb" : "white",
            }}
            disabled={disabled}
          >
            <option value="stable">Stable</option>
            <option value="worsening">Worsening</option>
            <option value="improving">Improving</option>
          </select>
        </label>

        <label style={{ fontSize: 12 }}>
          Comms pressure: {commsPressure}
          <input
            type="range"
            min={0}
            max={10}
            value={commsPressure}
            onChange={(e) =>
              !disabled &&
              onUpdateWorldState({ commsPressure: Number(e.target.value) })
            }
            style={{ width: "100%" }}
            disabled={disabled}
          />
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: "1fr 1fr",
          alignItems: "center",
          marginTop: 2,
        }}
      >
        <label style={{ fontSize: 12 }}>
          Lab backlog: {labBacklog}
          <input
            type="range"
            min={0}
            max={10}
            value={labBacklog}
            onChange={(e) =>
              !disabled &&
              onUpdateWorldState({ labBacklog: Number(e.target.value) })
            }
            style={{ width: "100%" }}
            disabled={disabled}
          />
        </label>

        <label style={{ fontSize: 12 }}>
          Public anxiety: {publicAnxiety}
          <input
            type="range"
            min={0}
            max={10}
            value={publicAnxiety}
            onChange={(e) =>
              !disabled &&
              onUpdateWorldState({ publicAnxiety: Number(e.target.value) })
            }
            style={{ width: "100%" }}
            disabled={disabled}
          />
        </label>
      </div>
    </div>
  );
}
