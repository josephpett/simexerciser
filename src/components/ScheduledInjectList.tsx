import React from "react";
import { Inject } from "../types";

function ScheduledInjectList({
  injects,
  onRecall,
  onSelectInject,
}: {
  injects: Inject[];
  onRecall: (idOrGroupId: string) => void;
  onSelectInject?: (injectId: string) => void;
}) {
  if (!injects.length) {
    return (
      <div style={{ fontSize: 12, color: "#6b7280" }}>
        No scheduled injects.
      </div>
    );
  }

  const teamName = (id: string) =>
    TEAMS.find((t) => t.id === id)?.name || id;

  const seen = new Set<string>();

  return (
    <div style={{ display: "grid", gap: 6, maxHeight: 180, overflowY: "auto" }}>
      {injects.map((inj) => {
        const isGroup = !!inj.groupId;
        if (isGroup) {
          if (seen.has(inj.groupId!)) return null;
          seen.add(inj.groupId!);
        }

        let label: string;
        if (isGroup) {
          if (
            inj.all &&
            inj.recipients &&
            inj.recipients.length === TEAMS.length
          ) {
            label = "All teams";
          } else if (inj.recipients && inj.recipients.length > 0) {
            label = inj.recipients.map(teamName).join(", ");
          } else {
            label = "Multiple teams";
          }
        } else {
          label = teamName(inj.teamId);
        }

        const fireTime = inj.scheduledFor
          ? new Date(inj.scheduledFor).toLocaleString()
          : "";

        return (
          <div
            key={inj.id}
            style={{
              padding: 8,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {inj.title} → {label}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                Fires at {fireTime}
              </div>
              {(inj.objectives?.length || inj.capabilities?.length) && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#4b5563",
                    marginTop: 2,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {inj.objectives?.length
                    ? `Obj: ${inj.objectives.join("; ")}`
                    : ""}
                  {inj.objectives?.length && inj.capabilities?.length ? " • " : ""}
                  {inj.capabilities?.length
                    ? `Cap: ${inj.capabilities.join("; ")}`
                    : ""}
                </div>
              )}
              {inj.phase && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#4b5563",
                    marginTop: 2,
                  }}
                >
                  Phase: {inj.phase}
                </div>
              )}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                alignItems: "flex-end",
              }}
            >
              <button
                onClick={() => onRecall(isGroup ? inj.groupId! : inj.id)}
                style={{
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  padding: "4px 10px",
                  background: "white",
                  fontSize: 11,
                }}
              >
                Cancel
              </button>
              {onSelectInject && (
                <button
                  type="button"
                  onClick={() => onSelectInject(inj.id)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid #d1d5db",
                    padding: "3px 8px",
                    background: "#f9fafb",
                    fontSize: 11,
                  }}
                >
                  Details
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ScheduledInjectList;

// -------- Sent inject list (with 30s recall window + ack summary) --------

