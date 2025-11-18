import React, { useState, useMemo, useEffect } from "react";
import {
  ExerciseDefinition,
  ExerciseStatus,
  ExerciseType,
  Inject,
  InjectStatus,
  EvaluationRating,
  MeltRow,
  ParticipantAction,
  ParticipantActionType,
  Team,
  TimelineEvent,
  WorldState,
  PersistedState,
} from "./types";
import {
  DEFAULT_EXERCISE,
  DEFAULT_PHASES,
  DEFAULT_WORLD_STATE,
  TEAMS,
  buildEmptyInboxes,
} from "./constants";
import TopBar from "./components/TopBar";
import Timeline from "./components/Timeline";
import MeltTable from "./components/MeltTable";
import ExerciseDefinitionPanel from "./components/ExerciseDefinitionPanel";
import ScenarioStructurePanel from "./components/ScenarioStructurePanel";
import ScenarioStatePanel from "./components/ScenarioStatePanel";
import TeamAckSummary from "./components/TeamAckSummary";
import {
  ExerciseStatusControls,
  PauseControls,
} from "./components/ExerciseStatusControls";
import FacilitatorViewComponent from "./components/FacilitatorView";
import ParticipantViewComponent from "./components/ParticipantView";
import InjectDetailsPanelComponent from "./components/InjectDetailsPanel";
import {
  clearState,
  loadState,
  saveState,
} from "./persistence/simExerciserStorage";

// SimExerciser MVP (single-file, StackBlitz-friendly)
// Features:
// - Hot injects (send now)
// - Scheduled injects (any future date/time)
// - Grouped multi-team sends in timeline
// - 30s recall window after sending
// - Participant identity (name + role) and team view
// - Pause / resume + timeline
// - Multi-team targeting (choose any combination of teams)
// - Local persistence (injects, inboxes, timeline, paused state, participant identity, participant view, exercise definition, world state)
// - Scenario state panel (epi trend + core stress variables)
// - Participant actions (acknowledge inject) + timeline logging
// - Inject metadata tags (objectives + capabilities) shown in lists/timeline
// - Facilitator timeline filters (by team, event category, and text search)
// - MELT-style view: facilitator can toggle between Timeline and MELT table of injects
// - Exercise setup panel (name, type, overview, objectives) aligned with WHO SimEx structures
// - Exercise lifecycle: draft → live → ended, with start/end events and locking of setup once live
// - Inject details panel for facilitators (from lists & MELT), including acknowledgements & world-state snapshot
// - Acknowledgement summaries in MELT and sent-inject list + per-team acknowledgement summary card
// - Per-inject evaluation rating + notes stored on injects and surfaced in details + MELT
// - NEW: Scenario structure panel (phases list) + per-inject phase assignment surfaced in MELT & details

// ---------- Constants ----------

const uid = () => Math.random().toString(36).slice(2, 9);

// ---------- Root Component ----------

export default function App() {
  const [view, setView] = useState<"fac" | "part">("fac");
  const [paused, setPaused] = useState(false);

  const [injects, setInjects] = useState<Inject[]>([]);
  const [inboxes, setInboxes] = useState<Record<string, Inject[]>>(
    () => buildEmptyInboxes()
  );
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const [participantTeamId, setParticipantTeamId] = useState<string>(
    TEAMS[0].id
  );
  const [participantTimelineMode, setParticipantTimelineMode] = useState<
    "team" | "global" | "hidden"
  >("team");

  const [participantName, setParticipantName] = useState<string>("");
  const [participantRole, setParticipantRole] = useState<string>("");
  const [participantLocked, setParticipantLocked] = useState<boolean>(false);

  const [worldState, setWorldState] = useState<WorldState>(
    DEFAULT_WORLD_STATE
  );
  const [participantActions, setParticipantActions] = useState<
    ParticipantAction[]
  >([]);

  const [exerciseDef, setExerciseDef] = useState<ExerciseDefinition>(
    DEFAULT_EXERCISE
  );

  const [exerciseStatus, setExerciseStatus] =
    useState<ExerciseStatus>("draft");
  const [exerciseStartAt, setExerciseStartAt] = useState<string | undefined>();
  const [exerciseEndAt, setExerciseEndAt] = useState<string | undefined>();

  const [exercisePhases, setExercisePhases] = useState<string[]>(() => [
    ...DEFAULT_PHASES,
  ]);

  // Used for recall window timing
  const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const addTimelineEvent = (evt: Omit<TimelineEvent, "id" | "ts">) => {
    setTimeline((prev) => [
      { id: uid(), ts: new Date().toISOString(), ...evt },
      ...prev,
    ]);
  };

  const updateWorldState = (patch: Partial<WorldState>) => {
    setWorldState((prev) => ({ ...prev, ...patch }));
  };

  const updateExerciseDef = (patch: Partial<ExerciseDefinition>) => {
    setExerciseDef((prev) => ({ ...prev, ...patch }));
  };

  const updateInject = (id: string, patch: Partial<Inject>) => {
    setInjects((prev) =>
      prev.map((inj) => (inj.id === id ? { ...inj, ...patch } : inj))
    );
  };

  // --- Load persisted state on first mount ---
  useEffect(() => {
    const data = loadState();
    if (!data) return;

    if (Array.isArray(data.injects)) {
      setInjects(data.injects);
    }

    const emptyInboxes = buildEmptyInboxes();
    if (data.inboxes && typeof data.inboxes === "object") {
      setInboxes({ ...emptyInboxes, ...data.inboxes });
    } else {
      setInboxes(emptyInboxes);
    }

    if (Array.isArray(data.timeline)) {
      setTimeline(data.timeline);
    }

    if (typeof data.paused === "boolean") {
      setPaused(data.paused);
    }

    if (data.participantTeamId) {
      const validTeamIds = TEAMS.map((t) => t.id);
      setParticipantTeamId(
        validTeamIds.includes(data.participantTeamId)
          ? data.participantTeamId
          : TEAMS[0].id
      );
    }

    if (data.participantTimelineMode) {
      setParticipantTimelineMode(data.participantTimelineMode);
    }

    if (typeof data.participantName === "string") {
      setParticipantName(data.participantName);
    }
    if (typeof data.participantRole === "string") {
      setParticipantRole(data.participantRole);
    }
    if (typeof data.participantLocked === "boolean") {
      setParticipantLocked(data.participantLocked);
    }

    if (data.worldState && typeof data.worldState === "object") {
      setWorldState(data.worldState);
    }

    if (Array.isArray(data.participantActions)) {
      setParticipantActions(data.participantActions);
    }

    if (data.exerciseDef && typeof data.exerciseDef === "object") {
      setExerciseDef({ ...DEFAULT_EXERCISE, ...data.exerciseDef });
    }

    if (data.exerciseStatus) {
      setExerciseStatus(data.exerciseStatus);
    }

    if (data.exerciseStartAt) {
      setExerciseStartAt(data.exerciseStartAt);
    }

    if (data.exerciseEndAt) {
      setExerciseEndAt(data.exerciseEndAt);
    }

    if (Array.isArray(data.exercisePhases)) {
      setExercisePhases(data.exercisePhases.filter((p) => typeof p === "string"));
    }
  }, []);

  // --- Persist state whenever it changes ---
  useEffect(() => {
    const data: PersistedState = {
      injects,
      inboxes,
      timeline,
      paused,
      participantTeamId,
      participantTimelineMode,
      participantName,
      participantRole,
      participantLocked,
      worldState,
      participantActions,
      exerciseDef,
      exerciseStatus,
      exerciseStartAt,
      exerciseEndAt,
      exercisePhases,
    };
    saveState(data);
  }, [
    injects,
    inboxes,
    timeline,
    paused,
    participantTeamId,
    participantTimelineMode,
    participantName,
    participantRole,
    participantLocked,
    worldState,
    participantActions,
    exerciseDef,
    exerciseStatus,
    exerciseStartAt,
    exerciseEndAt,
    exercisePhases,
  ]);

  // -------- Exercise lifecycle --------

  const handleStartExercise = () => {
    if (exerciseStatus !== "draft") return;
    const ts = new Date().toISOString();
    setExerciseStatus("live");
    setExerciseStartAt(ts);
    setExerciseEndAt(undefined);
    addTimelineEvent({ type: "exercise.started" });
  };

  const handleEndExercise = () => {
    if (exerciseStatus !== "live") return;
    const ts = new Date().toISOString();
    setExerciseStatus("ended");
    setExerciseEndAt(ts);
    addTimelineEvent({ type: "exercise.ended" });
  };

  const handleResetState = () => {
    if (!confirm("Reset the exercise and clear all local data?")) return;
    clearState();
    setInjects([]);
    setInboxes(buildEmptyInboxes());
    setTimeline([]);
    setPaused(false);
    setParticipantTeamId(TEAMS[0].id);
    setParticipantTimelineMode("team");
    setParticipantName("");
    setParticipantRole("");
    setParticipantLocked(false);
    setWorldState({ ...DEFAULT_WORLD_STATE });
    setParticipantActions([]);
    setExerciseDef({ ...DEFAULT_EXERCISE });
    setExerciseStatus("draft");
    setExerciseStartAt(undefined);
    setExerciseEndAt(undefined);
    setExercisePhases([...DEFAULT_PHASES]);
  };

  // -------- Hot injects (send now) --------
  const handleSendHot = ({
    title,
    body,
    teamIds,
    objectives,
    capabilities,
    phase,
  }: {
    title: string;
    body: string;
    teamIds: string[];
    objectives?: string[];
    capabilities?: string[];
    phase?: string;
  }) => {
    if (!title.trim() || teamIds.length === 0) return;

    const ts = new Date().toISOString();
    const targets = teamIds;
    const isAll = targets.length === TEAMS.length;
    const groupId = targets.length > 1 ? uid() : undefined;

    const newInjects: Inject[] = targets.map((tid, i) => ({
      id: uid(),
      groupId,
      title,
      body,
      teamId: tid,
      status: "sent",
      ts,
      all: isAll,
      groupMaster: groupId ? i === 0 : false,
      recipients: targets,
      objectives,
      capabilities,
      phase,
    }));

    setInjects((prev) => [...newInjects, ...prev]);

    setInboxes((prev) => {
      const next = { ...prev };
      newInjects.forEach((inj) => {
        next[inj.teamId] = [inj, ...next[inj.teamId]];
      });
      return next;
    });

    if (groupId) {
      addTimelineEvent({
        type: "inject.sent.group",
        title,
        recipients: targets,
        all: isAll,
        objectives,
        capabilities,
      });
    } else {
      addTimelineEvent({
        type: "inject.sent",
        title,
        teamId: targets[0],
        objectives,
        capabilities,
      });
    }
  };

  // -------- Scheduled injects --------
  const handleSchedule = ({
    title,
    body,
    teamIds,
    scheduledFor,
    objectives,
    capabilities,
    phase,
  }: {
    title: string;
    body: string;
    teamIds: string[];
    scheduledFor: string;
    objectives?: string[];
    capabilities?: string[];
    phase?: string;
  }) => {
    if (!title.trim() || !scheduledFor || teamIds.length === 0) return;

    const targets = teamIds;
    const isAll = targets.length === TEAMS.length;
    const groupId = targets.length > 1 ? uid() : undefined;
    const tsNow = new Date().toISOString();

    const newInjects: Inject[] = targets.map((tid, i) => ({
      id: uid(),
      groupId,
      title,
      body,
      teamId: tid,
      status: "queued",
      ts: tsNow,
      all: isAll,
      groupMaster: groupId ? i === 0 : false,
      recipients: targets,
      scheduledFor,
      objectives,
      capabilities,
      phase,
    }));

    setInjects((prev) => [...newInjects, ...prev]);

    if (groupId) {
      addTimelineEvent({
        type: "inject.queued.group",
        title,
        recipients: targets,
        all: isAll,
        scheduledAt: scheduledFor,
        objectives,
        capabilities,
      });
    } else {
      addTimelineEvent({
        type: "inject.queued",
        title,
        teamId: targets[0],
        scheduledAt: scheduledFor,
        objectives,
        capabilities,
      });
    }
  };

  // Scheduler: fires queued injects when due
  useEffect(() => {
    const timer = setInterval(() => {
      if (paused || exerciseStatus !== "live") return;

      setInjects((prev) => {
        const now = Date.now();
        let changed = false;
        const updated = [...prev];
        const toSend: Inject[] = [];

        updated.forEach((inj) => {
          if (inj.status === "queued" && inj.scheduledFor) {
            const dueMs = new Date(inj.scheduledFor).getTime();
            if (!isNaN(dueMs) && now >= dueMs) {
              inj.status = "sent";
              inj.ts = new Date().toISOString();
              toSend.push(inj);
              changed = true;
            }
          }
        });

        if (!changed) return prev;

        if (toSend.length > 0) {
          setInboxes((prevIb) => {
            const next = { ...prevIb };
            toSend.forEach((inj) => {
              next[inj.teamId] = [inj, ...(next[inj.teamId] || [])];
            });
            return next;
          });

          const groups: Record<string, Inject[]> = {};
          const singles: Inject[] = [];

          toSend.forEach((inj) => {
            if (inj.groupId) {
              if (!groups[inj.groupId]) groups[inj.groupId] = [];
              groups[inj.groupId].push(inj);
            } else {
              singles.push(inj);
            }
          });

          singles.forEach((inj) => {
            addTimelineEvent({
              type: "inject.sent",
              title: inj.title,
              teamId: inj.teamId,
              objectives: inj.objectives,
              capabilities: inj.capabilities,
            });
          });

          Object.values(groups).forEach((list) => {
            const master = list[0];
            addTimelineEvent({
              type: "inject.sent.group",
              title: master.title,
              recipients: master.recipients,
              all: master.all,
              objectives: master.objectives,
              capabilities: master.capabilities,
            });
          });
        }

        return [...updated];
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paused, exerciseStatus]);

  // -------- Recall (with 30s window for sent injects) --------
  const handleRecall = (idOrGroupId: string) => {
    const grouped = injects.filter(
      (i) => i.groupId && i.groupId === idOrGroupId
    );
    const idsToRecall = grouped.length
      ? grouped.map((i) => i.id)
      : [idOrGroupId];

    // Remove from inboxes
    setInboxes((prev) => {
      const next = { ...prev };
      for (const t of Object.keys(next)) {
        next[t] = next[t].filter((inj) => !idsToRecall.includes(inj.id));
      }
      return next;
    });

    // Mark as recalled
    setInjects((prev) =>
      prev.map((inj) =>
        idsToRecall.includes(inj.id)
          ? { ...inj, status: "recalled", ts: new Date().toISOString() }
          : inj
      )
    );

    addTimelineEvent({ type: "inject.recalled" });
  };

  const handlePause = () => {
    if (!paused && exerciseStatus === "live") {
      setPaused(true);
      addTimelineEvent({ type: "exercise.paused" });
    }
  };

  const handleResume = () => {
    if (paused && exerciseStatus === "live") {
      setPaused(false);
      addTimelineEvent({ type: "exercise.resumed" });
    }
  };

  // -------- Participant actions (acknowledge) --------
  const handleParticipantAction = ({
    injectId,
    teamId,
    actorName,
    actionType,
    title,
  }: {
    injectId: string;
    teamId: string;
    actorName?: string;
    actionType: ParticipantActionType;
    title: string;
  }) => {
    const ts = new Date().toISOString();

    setParticipantActions((prev) => {
      const already = prev.some(
        (a) =>
          a.injectId === injectId &&
          a.teamId === teamId &&
          a.type === actionType
      );
      if (already) return prev;
      const action: ParticipantAction = {
        id: uid(),
        ts,
        injectId,
        teamId,
        actorName,
        type: actionType,
      };
      return [action, ...prev];
    });

    addTimelineEvent({
      type: "inject.acknowledged",
      injectId,
      teamId,
      title,
      actorName,
      actionType,
    });
  };

  // -------- Derived data --------
  const sentInjects = injects.filter((i) => i.status === "sent");
  const queuedInjects = injects.filter((i) => i.status === "queued");
  const participantInbox = inboxes[participantTeamId] || [];

  const participantTimeline = useMemo(
    () => {
      if (participantTimelineMode === "hidden") {
        return [];
      }

      if (participantTimelineMode === "global") {
        return timeline;
      }

      // team-only mode
      return timeline.filter((e) => {
        if (e.type === "inject.sent.group") {
          if (e.all) return true;
          return e.recipients?.includes(participantTeamId);
        }
        if (e.type === "inject.sent") return e.teamId === participantTeamId;

        // Everyone sees global events
        return (
          e.type === "exercise.started" ||
          e.type === "exercise.ended" ||
          e.type === "exercise.paused" ||
          e.type === "exercise.resumed" ||
          e.type === "inject.recalled" ||
          e.type === "inject.acknowledged"
        );
      });
    },
    [timeline, participantTeamId, participantTimelineMode]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        background: "#f3f4f6",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <TopBar
        view={view}
        setView={setView}
        exerciseDef={exerciseDef}
        exerciseStatus={exerciseStatus}
        onReset={handleResetState}
      />

      {view === "fac" && (
        <FacilitatorViewComponent
          paused={paused}
          onPause={handlePause}
          onResume={handleResume}
          sentInjects={sentInjects}
          queuedInjects={queuedInjects}
          allInjects={injects}
          onSendHot={handleSendHot}
          onSchedule={handleSchedule}
          onRecall={handleRecall}
          timeline={timeline}
          nowMs={nowMs}
          participantTimelineMode={participantTimelineMode}
          setParticipantTimelineMode={setParticipantTimelineMode}
          worldState={worldState}
          onUpdateWorldState={updateWorldState}
          exerciseDef={exerciseDef}
          onUpdateExerciseDef={updateExerciseDef}
          exerciseStatus={exerciseStatus}
          exerciseStartAt={exerciseStartAt}
          exerciseEndAt={exerciseEndAt}
          onStartExercise={handleStartExercise}
          onEndExercise={handleEndExercise}
          participantActions={participantActions}
          onUpdateInject={updateInject}
          exercisePhases={exercisePhases}
          onUpdateExercisePhases={setExercisePhases}
          onSelectInject={setSelectedInjectId}
        />
      )}

      {view === "part" && (
        <ParticipantViewComponent
          teamId={participantTeamId}
          setTeamId={setParticipantTeamId}
          inbox={participantInbox}
          timeline={participantTimeline}
          paused={paused}
          participantTimelineMode={participantTimelineMode}
          name={participantName}
          role={participantRole}
          locked={participantLocked}
          setName={setParticipantName}
          setRole={setParticipantRole}
          setLocked={setParticipantLocked}
          participantActions={participantActions}
          onParticipantAction={handleParticipantAction}
          exerciseStatus={exerciseStatus}
        />
      )}
    </div>
  );
}
