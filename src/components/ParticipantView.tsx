import React, { useMemo, useState } from "react";
import { TEAMS } from "../constants";
import { Inject, ParticipantAction, TimelineEvent } from "../types";

function ParticipantView({
  teamId,
  setTeamId,
  inbox,
  timeline,
  paused,
  participantTimelineMode,
  name,
  role,
  locked,
  setName,
  setRole,
  setLocked,
  participantActions,
  onParticipantAction,
  exerciseStatus,
}: {
  teamId: string;
  setTeamId: (id: string) => void;
  inbox: Inject[];
  timeline: TimelineEvent[];
  paused: boolean;
  participantTimelineMode: "team" | "global" | "hidden";
  name: string;
  role: string;
  locked: boolean;
  setName: (name: string) => void;
  setRole: (role: string) => void;
  setLocked: (locked: boolean) => void;
  participantActions: ParticipantAction[];
  onParticipantAction: (opts: {
    injectId: string;
    teamId: string;
    actorName?: string;
    actionType: ParticipantActionType;
    title: string;
  }) => void;
  exerciseStatus: ExerciseStatus;
}) {
  const teamName = (id: string) =>
    TEAMS.find((t) => t.id === id)?.name || id;

  const canJoin = name.trim().length > 0;

  let statusBanner: { text: string; bg: string; color: string } | null = null;
  if (exerciseStatus === "draft") {
    statusBanner = {
      text: "Exercise has not started yet. You can still join and get ready.",
      bg: "#e0f2fe",
      color: "#075985",
    };
  } else if (exerciseStatus === "ended") {
    statusBanner = {
      text: "Exercise has ended. No new injects will be sent.",
      bg: "#fee2e2",
      color: "#991b1b",
    };
  }

  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
      {/* Left: inbox + identity */}
      <div
        style={{
          background: "white",
          padding: 16,
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Participant Dashboard</h3>

        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
          {locked ? (
            <>
              You are logged in as{" "}
              <span style={{ fontWeight: 600 }}>
                {name || "Unnamed participant"}
              </span>
              {role ? ` (${role})` : ""} — {teamName(teamId)}
            </>
          ) : (
            "Enter your details to join this exercise."
          )}
        </div>

        {statusBanner && (
          <div
            style={{
              marginBottom: 10,
              padding: 8,
              borderRadius: 8,
              fontSize: 12,
              background: statusBanner.bg,
              color: statusBanner.color,
            }}
          >
            {statusBanner.text}
          </div>
        )}

        {!locked ? (
          <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                borderRadius: 999,
                border: "1px solid #d1d5db",
                padding: "6px 10px",
                fontSize: 13,
              }}
            />
            <input
              placeholder="Your role (e.g., EOC Lead)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                borderRadius: 999,
                border: "1px solid #d1d5db",
                padding: "6px 10px",
                fontSize: 13,
              }}
            />
            <button
              onClick={() => {
                if (!canJoin) return;
                setLocked(true);
              }}
              disabled={!canJoin}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                background: canJoin ? "#2563eb" : "#9ca3af",
                color: "white",
                fontSize: 13,
              }}
            >
              Join exercise
            </button>
          </div>
        ) : (
          <button
            onClick={() => setLocked(false)}
            style={{
              marginBottom: 10,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              background: "white",
              fontSize: 12,
            }}
          >
            Edit identity
          </button>
        )}

        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          style={{
            borderRadius: 999,
            border: "1px solid #d1d5db",
            padding: "4px 10px",
            marginBottom: 12,
          }}
        >
          {TEAMS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {paused && exerciseStatus === "live" && (
          <div
            style={{
              marginBottom: 10,
              padding: 8,
              background: "#fef3c7",
              borderRadius: 8,
              fontSize: 12,
              color: "#92400e",
            }}
          >
            Exercise paused — no new injects.
          </div>
        )}

        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {inbox.length === 0 ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>No messages.</div>
          ) : (
            inbox.map((inj) => {
              const hasAck = participantActions.some(
                (a) =>
                  a.injectId === inj.id &&
                  a.teamId === teamId &&
                  a.type === "acknowledged"
              );
              const canAck =
                locked && !hasAck && exerciseStatus !== "ended";

              return (
                <div
                  key={inj.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 8,
                    marginBottom: 6,
                  }}
                >
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    {new Date(inj.ts).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {inj.title}
                  </div>
                  {inj.body && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "#374151",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {inj.body}
                    </div>
                  )}
                  {(inj.objectives?.length || inj.capabilities?.length) && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: "#4b5563",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {inj.objectives?.length
                        ? `Obj: ${inj.objectives.join("; ")}`
                        : ""}
                      {inj.objectives?.length && inj.capabilities?.length
                        ? " • "
                        : ""}
                      {inj.capabilities?.length
                        ? `Cap: ${inj.capabilities.join("; ")}`
                        : ""}
                    </div>
                  )}
                  {inj.phase && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: "#4b5563",
                      }}
                    >
                      Phase: {inj.phase}
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                    }}
                  >
                    {hasAck ? (
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "#dcfce7",
                          border: "1px solid #bbf7d0",
                          color: "#166534",
                        }}
                      >
                        Acknowledged
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAck}
                        onClick={() =>
                          onParticipantAction({
                            injectId: inj.id,
                            teamId,
                            actorName: name || undefined,
                            actionType: "acknowledged",
                            title: inj.title,
                          })
                        }
                        style={{
                          fontSize: 11,
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: "1px solid #d1d5db",
                          background: canAck ? "white" : "#f3f4f6",
                          color: canAck ? "#111827" : "#9ca3af",
                          cursor: canAck ? "pointer" : "default",
                        }}
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: timeline */}
      <div
        style={{
          background: "white",
          padding: 16,
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        <h4 style={{ fontSize: 14, fontWeight: 600 }}>
          {participantTimelineMode === "global"
            ? "Timeline (global)"
            : "Timeline"}
        </h4>

        {participantTimelineMode === "hidden" ? (
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Timeline is currently hidden by the facilitator.
          </div>
        ) : (
          <Timeline timeline={timeline} />
        )}
      </div>
    </div>
  );
}

export default ParticipantView;
