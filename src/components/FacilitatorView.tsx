import React, { useMemo, useState } from "react";
import {
  ExerciseDefinition,
  ExerciseStatus,
  Inject,
  MeltRow,
  ParticipantAction,
  TimelineEvent,
  WorldState,
} from "../types";
import { TEAMS } from "../constants";
import ExerciseDefinitionPanel from "./ExerciseDefinitionPanel";
import ScenarioStructurePanel from "./ScenarioStructurePanel";
import ScenarioStatePanel from "./ScenarioStatePanel";
import TeamAckSummary from "./TeamAckSummary";
import { ExerciseStatusControls, PauseControls } from "./ExerciseStatusControls";
import HotInjectForm from "./HotInjectForm";
import ScheduledInjectForm from "./ScheduledInjectForm";
import ScheduledInjectList from "./ScheduledInjectList";
import SentInjectList from "./SentInjectList";
import Timeline from "./Timeline";
import MeltTable from "./MeltTable";

const teamName = (id: string) => TEAMS.find((t) => t.id === id)?.name || id;

type FacilitatorViewProps = {
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  sentInjects: Inject[];
  queuedInjects: Inject[];
  allInjects: Inject[];
  onSendHot: (opts: {
    title: string;
    body: string;
    teamIds: string[];
    objectives?: string[];
    capabilities?: string[];
    phase?: string;
  }) => void;
  onSchedule: (opts: {
    title: string;
    body: string;
    teamIds: string[];
    scheduledFor: string;
    objectives?: string[];
    capabilities?: string[];
    phase?: string;
  }) => void;
  onRecall: (idOrGroupId: string) => void;
  timeline: TimelineEvent[];
  nowMs: number;
  participantTimelineMode: "team" | "global" | "hidden";
  setParticipantTimelineMode: (mode: "team" | "global" | "hidden") => void;
  worldState: WorldState;
  onUpdateWorldState: (patch: Partial<WorldState>) => void;
  exerciseDef: ExerciseDefinition;
  onUpdateExerciseDef: (patch: Partial<ExerciseDefinition>) => void;
  exerciseStatus: ExerciseStatus;
  exerciseStartAt?: string;
  exerciseEndAt?: string;
  onStartExercise: () => void;
  onEndExercise: () => void;
  participantActions: ParticipantAction[];
  onUpdateInject: (id: string, patch: Partial<Inject>) => void;
  exercisePhases: string[];
  onUpdateExercisePhases: (phases: string[]) => void;
  onSelectInject: (id: string) => void;
};

export default function FacilitatorView({
  paused,
  onPause,
  onResume,
  sentInjects,
  queuedInjects,
  allInjects,
  onSendHot,
  onSchedule,
  onRecall,
  timeline,
  nowMs,
  participantTimelineMode,
  setParticipantTimelineMode,
  worldState,
  onUpdateWorldState,
  exerciseDef,
  onUpdateExerciseDef,
  exerciseStatus,
  exerciseStartAt,
  exerciseEndAt,
  onStartExercise,
  onEndExercise,
  participantActions,
  onUpdateInject,
  exercisePhases,
  onUpdateExercisePhases,
  onSelectInject,
}: FacilitatorViewProps) {
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterText, setFilterText] = useState<string>("");
  const [rightTab, setRightTab] = useState<"timeline" | "melt">("timeline");
  const [selectedInjectId, setSelectedInjectId] = useState<string | null>(null);

  const selectedInject = useMemo(
    () => allInjects.find((i) => i.id === selectedInjectId) || null,
    [allInjects, selectedInjectId]
  );

  const groupMembers = useMemo(() => {
    if (!selectedInject?.groupId) return [] as Inject[];
    return allInjects.filter((i) => i.groupId === selectedInject.groupId);
  }, [allInjects, selectedInject?.groupId]);

  const filteredTimeline = useMemo(() => {
    return timeline.filter((evt) => {
      if (filterTeam !== "all") {
        const teamMatches = evt.teamId === filterTeam;
        const recipientsMatch = evt.recipients?.includes(filterTeam);
        if (!teamMatches && !recipientsMatch) return false;
      }

      if (filterCategory !== "all") {
        if (filterCategory === "injects") {
          if (!evt.type.startsWith("inject")) return false;
        } else if (filterCategory === "exercise") {
          if (!evt.type.startsWith("exercise")) return false;
        } else if (filterCategory === "actions") {
          if (!evt.type.startsWith("inject.acknowledged")) return false;
        }
      }

      if (filterText.trim()) {
        const hay = `${evt.title || ""} ${evt.type} ${
          evt.objectives?.join(" ") || ""
        } ${evt.capabilities?.join(" ") || ""} ${evt.actorName || ""}`
          .toLowerCase()
          .trim();
        if (!hay.includes(filterText.toLowerCase().trim())) return false;
      }

      return true;
    });
  }, [filterTeam, filterCategory, filterText, timeline]);

  const meltRows = useMemo<MeltRow[]>(() => {
    const rows: MeltRow[] = [];
    const seenGroups = new Set<string>();

    allInjects.forEach((inj) => {
      if (inj.groupId) {
        if (seenGroups.has(inj.groupId)) return;
        seenGroups.add(inj.groupId);

        const groupMembers = allInjects.filter((m) => m.groupId === inj.groupId);
        const recips = inj.recipients && inj.recipients.length > 0
          ? inj.recipients
          : groupMembers.map((m) => m.teamId);

        const targetTeamsSet = new Set<string>(
          recips && recips.length > 0 ? recips : groupMembers.map((m) => m.teamId)
        );
        const totalTargets = targetTeamsSet.size || recips.length || 0;

        const ackTeams = new Set<string>();
        participantActions.forEach((a) => {
          if (a.type !== "acknowledged") return;
          const foundVariant = groupMembers.find((m) => m.id === a.injectId);
          if (foundVariant) {
            ackTeams.add(foundVariant.teamId);
          }
        });

        let targetsLabel: string;
        if (inj.all && recips && recips.length === TEAMS.length) {
          targetsLabel = "All teams";
        } else if (recips && recips.length > 0) {
          targetsLabel = Array.from(targetTeamsSet)
            .map(teamName)
            .join(", ");
        } else {
          targetsLabel = "Multiple teams";
        }

        const whenIso = inj.scheduledFor || inj.ts;
        const whenDate = new Date(whenIso);
        const whenMs = whenDate.getTime();
        const whenLabel = isNaN(whenMs)
          ? "-"
          : whenDate.toLocaleString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "short",
            });

        rows.push({
          id: inj.groupId,
          injectId: inj.id,
          whenLabel,
          whenMs: isNaN(whenMs) ? 0 : whenMs,
          title: inj.title,
          targets: targetsLabel,
          status: inj.status,
          objectives: inj.objectives,
          capabilities: inj.capabilities,
          ackCount: ackTeams.size,
          totalTargets,
          evaluationRating: inj.evaluationRating,
          phase: inj.phase,
        });
      } else {
        const whenIso = inj.scheduledFor || inj.ts;
        const whenDate = new Date(whenIso);
        const whenMs = whenDate.getTime();
        const whenLabel = isNaN(whenMs)
          ? "-"
          : whenDate.toLocaleString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "short",
            });

        const hasAck = participantActions.some(
          (a) =>
            a.type === "acknowledged" &&
            a.injectId === inj.id &&
            a.teamId === inj.teamId
        );

        rows.push({
          id: inj.id,
          injectId: inj.id,
          whenLabel,
          whenMs: isNaN(whenMs) ? 0 : whenMs,
          title: inj.title,
          targets: teamName(inj.teamId),
          status: inj.status,
          objectives: inj.objectives,
          capabilities: inj.capabilities,
          ackCount: hasAck ? 1 : 0,
          totalTargets: 1,
          evaluationRating: inj.evaluationRating,
          phase: inj.phase,
        });
      }
    });

    rows.sort((a, b) => a.whenMs - b.whenMs);
    return rows;
  }, [allInjects, participantActions]);

  const teamAckSummary = useMemo(() => {
    const summary: Record<string, { total: number; ack: number }> = {};
    TEAMS.forEach((t) => {
      summary[t.id] = { total: 0, ack: 0 };
    });

    const sent = allInjects.filter((i) => i.status === "sent");
    sent.forEach((inj) => {
      if (!summary[inj.teamId]) return;
      summary[inj.teamId].total += 1;
      const hasAck = participantActions.some(
        (a) =>
          a.type === "acknowledged" &&
          a.injectId === inj.id &&
          a.teamId === inj.teamId
      );
      if (hasAck) summary[inj.teamId].ack += 1;
    });

    return summary;
  }, [allInjects, participantActions]);

  const injectControlsDisabled = exerciseStatus !== "live" || paused;

  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1.4fr 1fr" }}>
      <div
        style={{
          background: "white",
          padding: 16,
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <ExerciseStatusControls
          exerciseStatus={exerciseStatus}
          exerciseStartAt={exerciseStartAt}
          exerciseEndAt={exerciseEndAt}
          onStartExercise={onStartExercise}
          onEndExercise={onEndExercise}
        />

        <PauseControls
          paused={paused}
          onPause={onPause}
          onResume={onResume}
          exerciseStatus={exerciseStatus}
        />

        <ExerciseDefinitionPanel
          exerciseDef={exerciseDef}
          onUpdateExerciseDef={onUpdateExerciseDef}
          disabled={exerciseStatus !== "draft"}
        />

        <ScenarioStructurePanel
          phases={exercisePhases}
          onUpdatePhases={onUpdateExercisePhases}
          disabled={exerciseStatus !== "draft"}
        />

        <ScenarioStatePanel
          worldState={worldState}
          onUpdateWorldState={onUpdateWorldState}
          disabled={exerciseStatus === "ended"}
        />

        <TeamAckSummary summary={teamAckSummary} />

        <div
          style={{
            marginBottom: 12,
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 13,
          }}
        >
          <span style={{ fontWeight: 500 }}>Participant timeline:</span>
          <select
            value={participantTimelineMode}
            onChange={(e) =>
              setParticipantTimelineMode(
                e.target.value as "team" | "global" | "hidden"
              )
            }
            style={{
              borderRadius: 999,
              border: "1px solid #d1d5db",
              padding: "4px 10px",
            }}
          >
            <option value="team">Team-only</option>
            <option value="global">Global</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>

        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          Hot inject
        </h4>
        <HotInjectForm
          onSend={onSendHot}
          disabled={injectControlsDisabled}
          phases={exercisePhases}
        />

        <div style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Schedule inject
          </h4>
          <ScheduledInjectForm
            onSchedule={onSchedule}
            disabled={injectControlsDisabled}
            phases={exercisePhases}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Scheduled injects
          </h4>
          <ScheduledInjectList
            injects={queuedInjects}
            onRecall={onRecall}
            onSelectInject={setSelectedInjectId}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Recently sent injects
          </h4>
          <SentInjectList
            injects={sentInjects}
            onRecall={onRecall}
            nowMs={nowMs}
            onSelectInject={setSelectedInjectId}
            participantActions={participantActions}
          />
        </div>
      </div>

      <div
        style={{
          background: "white",
          padding: 16,
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: 8,
          }}
        >
          <button
            onClick={() => setRightTab("timeline")}
            style={{
              borderRadius: 999,
              padding: "6px 12px",
              border: "1px solid #d1d5db",
              background: rightTab === "timeline" ? "#ede9fe" : "white",
              fontWeight: 600,
            }}
          >
            Timeline
          </button>
          <button
            onClick={() => setRightTab("melt")}
            style={{
              borderRadius: 999,
              padding: "6px 12px",
              border: "1px solid #d1d5db",
              background: rightTab === "melt" ? "#ede9fe" : "white",
              fontWeight: 600,
            }}
          >
            MELT
          </button>

          {rightTab === "timeline" && (
            <div
              style={{
                display: "flex",
                gap: 6,
                marginLeft: "auto",
                alignItems: "center",
              }}
            >
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                style={{
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  padding: "3px 8px",
                }}
              >
                <option value="all">All teams</option>
                {TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  padding: "3px 8px",
                }}
              >
                <option value="all">All events</option>
                <option value="injects">Injects</option>
                <option value="exercise">Exercise state</option>
                <option value="actions">Acknowledgements</option>
              </select>

              <input
                placeholder="Filter text (title/obj/cap/actor)"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                style={{
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  padding: "3px 8px",
                  minWidth: 140,
                }}
              />
            </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          {rightTab === "timeline" ? (
            <Timeline timeline={filteredTimeline} />
          ) : (
            <MeltTable
              rows={meltRows}
              onSelectInject={(id) => {
                setSelectedInjectId(id);
                onSelectInject(id);
                setRightTab("melt");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
