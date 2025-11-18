import React from "react";
import { ExerciseDefinition, ExerciseType } from "../types";

type ExerciseDefinitionPanelProps = {
  exerciseDef: ExerciseDefinition;
  onUpdateExerciseDef: (patch: Partial<ExerciseDefinition>) => void;
  disabled?: boolean;
};

export default function ExerciseDefinitionPanel({
  exerciseDef,
  onUpdateExerciseDef,
  disabled,
}: ExerciseDefinitionPanelProps) {
  const commonInputStyle: React.CSSProperties = {
    borderRadius: 999,
    border: "1px solid #d1d5db",
    padding: "6px 10px",
    fontSize: 12,
    backgroundColor: disabled ? "#f9fafb" : "white",
  };

  const commonTextareaStyle: React.CSSProperties = {
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    padding: "6px 10px",
    fontSize: 12,
    backgroundColor: disabled ? "#f9fafb" : "white",
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
        gap: 8,
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
        <span>Exercise setup info</span>
        <span style={{ fontSize: 11, color: "#6b7280" }}>
          (name, type, objectives)
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 8,
          alignItems: "center",
        }}
      >
        <input
          placeholder="Exercise name"
          value={exerciseDef.name}
          onChange={(e) =>
            !disabled && onUpdateExerciseDef({ name: e.target.value })
          }
          style={commonInputStyle}
          disabled={disabled}
        />
        <select
          value={exerciseDef.type}
          onChange={(e) =>
            !disabled &&
            onUpdateExerciseDef({
              type: e.target.value as ExerciseType,
            })
          }
          style={commonInputStyle}
          disabled={disabled}
        >
          <option value="tabletop">Tabletop</option>
          <option value="drill">Drill</option>
          <option value="functional">Functional</option>
          <option value="full-scale">Full-scale</option>
        </select>
      </div>

      <textarea
        placeholder="Overview / scope (e.g. acute respiratory outbreak in Province X, focus on coordination between EOC, lab, comms)"
        value={exerciseDef.overview}
        onChange={(e) =>
          !disabled && onUpdateExerciseDef({ overview: e.target.value })
        }
        rows={2}
        style={commonTextareaStyle}
        disabled={disabled}
      />

      <textarea
        placeholder="Primary objectives (e.g. test case detection and reporting; assess inter-agency coordination; validate risk communication workflows)"
        value={exerciseDef.primaryObjectives}
        onChange={(e) =>
          !disabled &&
          onUpdateExerciseDef({
            primaryObjectives: e.target.value,
          })
        }
        rows={2}
        style={commonTextareaStyle}
        disabled={disabled}
      />
    </div>
  );
}
