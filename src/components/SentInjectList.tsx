import React from "react";
import { Inject, ParticipantAction } from "../types";

function SentInjectList({
  injects,
  onRecall,
  nowMs,
  onSelectInject,
  participantActions,
}: {
  injects: Inject[];
  onRecall: (idOrGroupId: string) => void;
  nowMs: number;
  onSelectInject?: (injectId: string) => void;
  participantActions: ParticipantAction[];
}) {
  if (!injects.length) {
    return (
      <div style={{ fontSize: 12, color: "#6b7280" }}>
        No sent injects yet.
      </div>
    );
  }

  const teamName = (id: string) =>
    TEAMS.find((t) => t.id === id)?.name || id;

  const seen = new Set<string>();
  const RECALL_WINDOW_MS = 30000;

  return (
    <div style={{ display: "grid", gap: 6, maxHeight: 200, overflowY: "auto" }}>
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

        const sentAtMs = new Date(inj.ts).getTime();
        const withinWindow =
          !isNaN(sentAtMs) && nowMs - sentAtMs <= RECALL_WINDOW_MS;

        // Ack summary for this inject or group
        let ackSummaryLabel = "";
        if (isGroup && inj.groupId) {
          const groupMembers = injects.filter(
            (j) => j.groupId === inj.groupId
          );
          const targetTeams = new Set(groupMembers.map((m) => m.teamId));
          const ackTeams = new Set<string>();
          participantActions.forEach((a) => {
            if (a.type !== "acknowledged") return;
            const foundVariant = groupMembers.find(
              (m) => m.id === a.injectId
            );
            if (foundVariant) {
              ackTeams.add(foundVariant.teamId);
            }
          });
          const totalTargets = targetTeams.size;
          const ackCount = ackTeams.size;
          if (totalTargets > 0) {
            ackSummaryLabel = `${ackCount} / ${totalTargets} team${
              totalTargets > 1 ? "s" : ""
            } acknowledged`;
          }
        } else {
          const hasAck = participantActions.some(
            (a) =>
              a.type === "acknowledged" &&
              a.injectId === inj.id &&
              a.teamId === inj.teamId
          );
          ackSummaryLabel = hasAck
            ? "Acknowledged"
            : "Not yet acknowledged";
        }

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
                Sent{" "}
                {new Date(inj.ts).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
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
              {ackSummaryLabel && (
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    color: "#16a34a",
                  }}
                >
                  {ackSummaryLabel}
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
              {withinWindow ? (
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
                  Recall
                </button>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                    alignSelf: "center",
                  }}
                >
                  Recall expired
                </span>
              )}
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

// -------- Participant view (with identity) --------

export default SentInjectList;
