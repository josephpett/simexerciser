import React from "react";
import { ExerciseDefinition, ExerciseStatus } from "../types";

export default function TopBar({
  view,
  setView,
  exerciseDef,
  exerciseStatus,
  onReset,
}: {
  view: "fac" | "part";
  setView: (v: "fac" | "part") => void;
  exerciseDef: ExerciseDefinition;
  exerciseStatus: ExerciseStatus;
  onReset: () => void;
}) {
  const exerciseTypeLabel = {
    tabletop: "Tabletop",
    drill: "Drill",
    functional: "Functional",
    "full-scale": "Full-scale",
  }[exerciseDef.type];

  const statusLabel =
    exerciseStatus === "draft"
      ? "Draft"
      : exerciseStatus === "live"
      ? "Live"
      : "Ended";

  const statusColor =
    exerciseStatus === "draft"
      ? "#e5e7eb"
      : exerciseStatus === "live"
      ? "#bbf7d0"
      : "#fecaca";

  const statusTextColor =
    exerciseStatus === "draft"
      ? "#374151"
      : exerciseStatus === "live"
      ? "#166534"
      : "#991b1b";

  return (
    <div
      style={{
        marginBottom: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      <div>
        <div style={{ fontSize: 20, fontWeight: 600 }}>SimExerciser</div>
        <div
          style={{
            fontSize: 12,
            color: "#6b7280",
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 2,
          }}
        >
          <span>{exerciseDef.name || "Untitled exercise"}</span>
          <span>· {exerciseTypeLabel}</span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 999,
              background: statusColor,
              color: statusTextColor,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={onReset}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "white",
            color: "#b91c1c",
            fontWeight: 600,
          }}
        >
          Reset state
        </button>

        <div
          style={{
            display: "inline-flex",
            background: "white",
            borderRadius: 999,
            padding: 4,
            border: "1px solid #e5e7eb",
            gap: 4,
          }}
        >
          <button
            onClick={() => setView("fac")}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              background: view === "fac" ? "#111827" : "white",
              color: view === "fac" ? "white" : "#111827",
            }}
          >
            Facilitator
          </button>
          <button
            onClick={() => setView("part")}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              background: view === "part" ? "#111827" : "white",
              color: view === "part" ? "white" : "#111827",
            }}
          >
            Participant
          </button>
        </div>
      </div>
    </div>
  );
}
