import React from "react";
import { ExerciseStatus } from "../types";

type ExerciseStatusControlsProps = {
  exerciseStatus: ExerciseStatus;
  exerciseStartAt?: string;
  exerciseEndAt?: string;
  onStartExercise: () => void;
  onEndExercise: () => void;
};

export function ExerciseStatusControls({
  exerciseStatus,
  exerciseStartAt,
  exerciseEndAt,
  onStartExercise,
  onEndExercise,
}: ExerciseStatusControlsProps) {
  const startLabel = exerciseStartAt
    ? new Date(exerciseStartAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const endLabel = exerciseEndAt
    ? new Date(exerciseEndAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      style={{
        marginBottom: 12,
        padding: 10,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontSize: 13 }}>
        <div style={{ fontWeight: 600 }}>Exercise lifecycle</div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          {exerciseStatus === "draft" && "Configure setup, then start exercise."}
          {exerciseStatus === "live" &&
            `Running${startLabel ? ` since ${startLabel}` : ""}.`}
          {exerciseStatus === "ended" &&
            `Ended${endLabel ? ` at ${endLabel}` : ""}.`}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {exerciseStatus === "draft" && (
          <button
            type="button"
            onClick={onStartExercise}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "none",
              background: "#16a34a",
              color: "white",
              fontSize: 12,
            }}
          >
            Start exercise
          </button>
        )}
        {exerciseStatus === "live" && (
          <button
            type="button"
            onClick={onEndExercise}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "none",
              background: "#b91c1c",
              color: "white",
              fontSize: 12,
            }}
          >
            End exercise
          </button>
        )}
        {exerciseStatus === "ended" && (
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              color: "#6b7280",
            }}
          >
            Exercise ended
          </span>
        )}
      </div>
    </div>
  );
}

type PauseControlsProps = {
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  exerciseStatus: ExerciseStatus;
};

export function PauseControls({
  paused,
  onPause,
  onResume,
  exerciseStatus,
}: PauseControlsProps) {
  const controlsDisabled = exerciseStatus !== "live";

  return (
    <div
      style={{
        marginBottom: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        opacity: controlsDisabled ? 0.5 : 1,
      }}
    >
      {paused ? (
        <button
          onClick={onResume}
          disabled={controlsDisabled}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            border: "none",
            background: controlsDisabled ? "#9ca3af" : "#059669",
            color: "white",
          }}
        >
          Resume
        </button>
      ) : (
        <button
          onClick={onPause}
          disabled={controlsDisabled}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            border: "none",
            background: controlsDisabled ? "#9ca3af" : "#d97706",
            color: "white",
          }}
        >
          Pause
        </button>
      )}
      {controlsDisabled && (
        <span style={{ fontSize: 11, color: "#6b7280" }}>
          Pause/resume available when exercise is live.
        </span>
      )}
    </div>
  );
}
