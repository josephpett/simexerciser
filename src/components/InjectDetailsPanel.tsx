import React from "react";
import { TEAMS } from "../constants";
import { EvaluationRating, Inject, ParticipantAction, WorldState } from "../types";

function InjectDetailsPanel({
  selectedInject,
  groupMembers,
  participantActions,
  worldState,
  onClose,
  onUpdateInject,
}: {
  selectedInject: Inject | null;
  groupMembers: Inject[];
  participantActions: ParticipantAction[];
  worldState: WorldState;
  onClose: () => void;
  onUpdateInject: (id: string, patch: Partial<Inject>) => void;
}) {
  if (!selectedInject) {
    return (
      <div
        style={{
          borderRadius: 12,
          border: "1px dashed #e5e7eb",
          padding: 8,
          fontSize: 11,
          color: "#6b7280",
        }}
      >
        Select an inject from the lists or MELT to see details,
        targets, acknowledgements and evaluation.
      </div>
    );
  }

  const teamName = (id: string) =>
    TEAMS.find((t) => t.id === id)?.name || id;

  const variants =
    groupMembers && groupMembers.length > 0 ? groupMembers : [selectedInject];

  const uniqueTeams = Array.from(
    new Set(variants.map((v) => v.teamId))
  );

  const isGroup = uniqueTeams.length > 1;

  // Collect acknowledgements for all variants in the group
  const injectIds = new Set(variants.map((v) => v.id));
  const acks = participantActions.filter((a) => injectIds.has(a.injectId));

  // Group acks by team for a quick summary
  const acksByTeam: Record<
    string,
    { count: number; latestTs: string; names: Set<string> }
  > = {};
  acks.forEach((a) => {
    if (!acksByTeam[a.teamId]) {
      acksByTeam[a.teamId] = {
        count: 0,
        latestTs: a.ts,
        names: new Set<string>(),
      };
    }
    const bucket = acksByTeam[a.teamId];
    bucket.count += 1;
    if (new Date(a.ts).getTime() > new Date(bucket.latestTs).getTime()) {
      bucket.latestTs = a.ts;
    }
    if (a.actorName) bucket.names.add(a.actorName);
  });

  const epiTrend =
    worldState.epiTrend === "worsening"
      ? "Worsening"
      : worldState.epiTrend === "improving"
      ? "Improving"
      : "Stable";

  const commsPressure =
    typeof worldState.commsPressure === "number"
      ? worldState.commsPressure
      : 3;
  const labBacklog =
    typeof worldState.labBacklog === "number" ? worldState.labBacklog : 3;
  const publicAnxiety =
    typeof worldState.publicAnxiety === "number" ? worldState.publicAnxiety : 3;

  const ratingLabel = (r?: EvaluationRating) => {
    if (!r) return "No rating";
    if (r === "not_observed") return "Not observed";
    if (r === "partially") return "Partially achieved";
    if (r === "achieved") return "Achieved";
    if (r === "exceeded") return "Exceeded";
    return "No rating";
  };

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: 10,
        background: "#f9fafb",
        fontSize: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Inject details</div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            {isGroup ? "Multi-team inject" : "Single-team inject"}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 999,
            border: "1px solid #d1d5db",
            background: "white",
          }}
        >
          Close
        </button>
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ fontWeight: 600 }}>{selectedInject.title}</div>
        {selectedInject.body && (
          <div
            style={{
              marginTop: 2,
              fontSize: 11,
              color: "#374151",
              whiteSpace: "pre-wrap",
            }}
          >
            {selectedInject.body}
          </div>
        )}
      </div>

      {(selectedInject.objectives?.length ||
        selectedInject.capabilities?.length) && (
        <div
          style={{
            marginBottom: 6,
            fontSize: 11,
            color: "#4b5563",
            whiteSpace: "pre-wrap",
          }}
        >
          {selectedInject.objectives?.length
            ? `Objectives: ${selectedInject.objectives.join("; ")}`
            : ""}
          {selectedInject.objectives?.length &&
          selectedInject.capabilities?.length
            ? " • "
            : ""}
          {selectedInject.capabilities?.length
            ? `Capabilities: ${selectedInject.capabilities.join("; ")}`
            : ""}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            Targets
          </div>
          <div style={{ fontSize: 11, color: "#374151" }}>
            {uniqueTeams.map(teamName).join(", ")}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
            Status:{" "}
            <span style={{ textTransform: "capitalize" }}>
              {selectedInject.status}
            </span>
          </div>
          {selectedInject.phase && (
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Phase: {selectedInject.phase}
            </div>
          )}
          {!selectedInject.phase && (
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              Phase: Unassigned
            </div>
          )}
          {selectedInject.scheduledFor && (
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Scheduled:{" "}
              {new Date(selectedInject.scheduledFor).toLocaleString()}
            </div>
          )}
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            Last update: {new Date(selectedInject.ts).toLocaleString()}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            Acknowledgements
          </div>
          {acks.length === 0 ? (
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              No acknowledgements yet.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 3,
                fontSize: 11,
              }}
            >
              {Object.entries(acksByTeam).map(([teamId, info]) => {
                const names =
                  info.names.size > 0
                    ? Array.from(info.names).join(", ")
                    : "Unnamed";
                return (
                  <div key={teamId}>
                    <span style={{ fontWeight: 500 }}>
                      {teamName(teamId)}
                    </span>
                    {": "}
                    {names} —{" "}
                    {new Date(info.latestTs).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Evaluation section */}
      <div
        style={{
          marginTop: 4,
          paddingTop: 6,
          borderTop: "1px solid #e5e7eb",
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 8,
          fontSize: 11,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>
            Evaluation rating
          </div>
          <select
            value={selectedInject.evaluationRating || ""}
            onChange={(e) =>
              onUpdateInject(selectedInject.id, {
                evaluationRating: e.target.value
                  ? (e.target.value as EvaluationRating)
                  : undefined,
              })
            }
            style={{
              borderRadius: 999,
              border: "1px solid #d1d5db",
              padding: "4px 8px",
              fontSize: 11,
              width: "100%",
            }}
          >
            <option value="">No rating</option>
            <option value="not_observed">Not observed</option>
            <option value="partially">Partially achieved</option>
            <option value="achieved">Achieved</option>
            <option value="exceeded">Exceeded</option>
          </select>
          <div style={{ marginTop: 2, color: "#6b7280" }}>
            Current: {ratingLabel(selectedInject.evaluationRating)}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>
            Evaluation notes
          </div>
          <textarea
            value={selectedInject.evaluationNotes || ""}
            onChange={(e) =>
              onUpdateInject(selectedInject.id, {
                evaluationNotes: e.target.value,
              })
            }
            rows={3}
            placeholder="Observed behaviour, strengths, gaps, points for AAR..."
            style={{
              width: "100%",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              padding: "4px 6px",
              fontSize: 11,
              resize: "vertical",
            }}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 6,
          paddingTop: 4,
          borderTop: "1px dashed #e5e7eb",
          fontSize: 11,
          color: "#4b5563",
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr 1fr",
          gap: 6,
        }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>Scenario snapshot</div>
          <div style={{ marginTop: 1 }}>Epi trend: {epiTrend}</div>
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>Operational load</div>
          <div>Comms pressure: {commsPressure}</div>
          <div>Lab backlog: {labBacklog}</div>
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>Public response</div>
          <div>Public anxiety: {publicAnxiety}</div>
        </div>
      </div>
    </div>
  );
}

export default InjectDetailsPanel;
