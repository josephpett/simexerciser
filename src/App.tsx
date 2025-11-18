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
  STORAGE_KEY,
  TEAMS,
  buildEmptyInboxes,
  parsePhases,
} from "./constants";
import TopBar from "./components/TopBar";
import Timeline from "./components/Timeline";
import MeltTable from "./components/MeltTable";
import {
  clearState,
  loadState,
  saveState,
} from "./persistence/simExerciserStorage";
} from "./types";

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

type PersistedState = {
  injects: Inject[];
  inboxes: Record<string, Inject[]>;
  timeline: TimelineEvent[];
  paused: boolean;
  participantTeamId: string;
  participantTimelineMode: "team" | "global" | "hidden";
  participantName?: string;
  participantRole?: string;
  participantLocked?: boolean;
  worldState?: WorldState;
  participantActions?: ParticipantAction[];
  exerciseDef?: ExerciseDefinition;
  exerciseStatus?: ExerciseStatus;
  exerciseStartAt?: string;
  exerciseEndAt?: string;
  exercisePhases?: string[];
};

// ---------- Constants ----------

const STORAGE_KEY = "simexit_mvp_state_v1";

const DEFAULT_WORLD_STATE: WorldState = {
  epiTrend: "stable",
  commsPressure: 2,
  labBacklog: 1,
  publicAnxiety: 2,
};

const TEAMS: Team[] = [
  { id: "team_eoc", name: "EOC" },
  { id: "team_lab", name: "Lab" },
  { id: "team_comm", name: "Comms" },
  { id: "team_field", name: "Field" },
];

const DEFAULT_EXERCISE: ExerciseDefinition = {
  name: "Untitled exercise",
  type: "tabletop",
  overview: "",
  primaryObjectives: "",
};

const DEFAULT_PHASES = ["Phase 1", "Phase 2", "Phase 3"];

const uid = () => Math.random().toString(36).slice(2, 9);

const buildEmptyInboxes = (): Record<string, Inject[]> =>
  Object.fromEntries(TEAMS.map((t) => [t.id, []]));

const parsePhases = (value: string): string[] =>
  value
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

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
    localStorage.removeItem(STORAGE_KEY);
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
        <FacilitatorView
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
        />
      )}

      {view === "part" && (
        <ParticipantView
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

// ---------- UI Components ----------

function TopBar({
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
  );
}

function FacilitatorView({
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
}: {
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
}) {
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterText, setFilterText] = useState<string>("");
  const [rightTab, setRightTab] = useState<"timeline" | "melt">("timeline");

  // currently selected inject (for details panel)
  const [selectedInjectId, setSelectedInjectId] = useState<string | null>(
    null
  );

  const selectedInject = useMemo(
    () => allInjects.find((inj) => inj.id === selectedInjectId) || null,
    [allInjects, selectedInjectId]
  );

  const selectedGroupMembers = useMemo(() => {
    if (!selectedInject) return [];
    if (!selectedInject.groupId) return [selectedInject];
    return allInjects.filter((inj) => inj.groupId === selectedInject.groupId);
  }, [selectedInject, allInjects]);

  const filteredTimeline = useMemo(
    () =>
      timeline.filter((e) => {
        // Team filter
        if (filterTeam !== "all") {
          const isGlobalEvent =
            e.type === "exercise.started" ||
            e.type === "exercise.ended" ||
            e.type === "exercise.paused" ||
            e.type === "exercise.resumed" ||
            e.type === "inject.recalled";
          if (!isGlobalEvent) {
            const matchesTeam =
              e.teamId === filterTeam ||
              (e.recipients && e.recipients.includes(filterTeam));
            if (!matchesTeam) return false;
          }
        }

        // Category filter
        if (filterCategory === "injects") {
          if (!e.type.startsWith("inject.")) return false;
        } else if (filterCategory === "exercise") {
          if (!e.type.startsWith("exercise.")) return false;
        } else if (filterCategory === "actions") {
          if (e.type !== "inject.acknowledged") return false;
        }

        // Text filter
        if (filterText.trim().length > 0) {
          const q = filterText.toLowerCase();
          const pieces: string[] = [];
          if (e.title) pieces.push(e.title);
          if (e.actorName) pieces.push(e.actorName);
          if (e.objectives?.length) pieces.push(e.objectives.join(" "));
          if (e.capabilities?.length) pieces.push(e.capabilities.join(" "));
          const haystack = pieces.join(" ").toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        return true;
      }),
    [timeline, filterTeam, filterCategory, filterText]
  );

  // MELT rows with ack + evaluation + phase summary
  const meltRows = useMemo(() => {
    if (!allInjects.length) return [] as MeltRow[];

    const rows: MeltRow[] = [];
    const seenGroups = new Set<string>();
    const teamName = (id: string) =>
      TEAMS.find((t) => t.id === id)?.name || id;

    allInjects.forEach((inj) => {
      if (inj.groupId) {
        if (seenGroups.has(inj.groupId)) return;
        seenGroups.add(inj.groupId);

        const groupMembers = allInjects.filter(
          (j) => j.groupId === inj.groupId
        );
        const recips =
          inj.recipients && inj.recipients.length > 0
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
        if (
          inj.all &&
          recips &&
          recips.length === TEAMS.length
        ) {
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

  // Per-team acknowledgement summary
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

  const injectControlsDisabled =
    exerciseStatus !== "live" || paused;

  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1.4fr 1fr" }}>
      {/* Left column */}
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

      {/* Right column: details + Timeline / MELT */}
      <div
        style={{
          background: "white",
          padding: 16,
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          maxHeight: "75vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Inject details panel */}
        <InjectDetailsPanel
          selectedInject={selectedInject}
          groupMembers={selectedGroupMembers}
          participantActions={participantActions}
          worldState={worldState}
          onClose={() => setSelectedInjectId(null)}
          onUpdateInject={onUpdateInject}
        />

        {/* Tabs + filters + content */}
        <div
          style={{
            marginTop: 4,
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setRightTab("timeline")}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid #d1d5db",
                fontSize: 12,
                background:
                  rightTab === "timeline" ? "#111827" : "transparent",
                color: rightTab === "timeline" ? "white" : "#111827",
              }}
            >
              Timeline
            </button>
            <button
              onClick={() => setRightTab("melt")}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid #d1d5db",
                fontSize: 12,
                background: rightTab === "melt" ? "#111827" : "transparent",
                color: rightTab === "melt" ? "white" : "#111827",
              }}
            >
              MELT
            </button>
          </div>

          {rightTab === "timeline" && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                fontSize: 11,
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
              onSelectInject={(id) => setSelectedInjectId(id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ExerciseStatusControls({
  exerciseStatus,
  exerciseStartAt,
  exerciseEndAt,
  onStartExercise,
  onEndExercise,
}: {
  exerciseStatus: ExerciseStatus;
  exerciseStartAt?: string;
  exerciseEndAt?: string;
  onStartExercise: () => void;
  onEndExercise: () => void;
}) {
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

function PauseControls({
  paused,
  onPause,
  onResume,
  exerciseStatus,
}: {
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  exerciseStatus: ExerciseStatus;
}) {
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

function ExerciseDefinitionPanel({
  exerciseDef,
  onUpdateExerciseDef,
  disabled,
}: {
  exerciseDef: ExerciseDefinition;
  onUpdateExerciseDef: (patch: Partial<ExerciseDefinition>) => void;
  disabled?: boolean;
}) {
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

function ScenarioStructurePanel({
  phases,
  onUpdatePhases,
  disabled,
}: {
  phases: string[];
  onUpdatePhases: (phases: string[]) => void;
  disabled?: boolean;
}) {
  const [raw, setRaw] = useState<string>(phases.join(", "));

  useEffect(() => {
    // Only sync the textarea when the upstream phases actually change.
    // This avoids wiping in-progress typing (e.g., after entering a comma
    // or space) while still reflecting external resets/loads.
    const parsedRaw = parsePhases(raw);
    const parsedPhases = parsePhases(phases.join(", "));
    if (parsedRaw.join("|") !== parsedPhases.join("|")) {
      setRaw(phases.join(", "));
    }
  }, [phases]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRaw(value);
    if (disabled) return;
    onUpdatePhases(parsePhases(value));
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
        gap: 6,
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
        <span>Scenario structure</span>
        <span style={{ fontSize: 11, color: "#6b7280" }}>
          (phases in order)
        </span>
      </div>
      <textarea
        placeholder="Phases in order (e.g. Detection, Escalation, Response)"
        value={raw}
        onChange={handleChange}
        rows={2}
        style={{
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          padding: "6px 10px",
          fontSize: 12,
          backgroundColor: disabled ? "#f9fafb" : "white",
        }}
        disabled={disabled}
      />
      {phases.length > 0 && (
        <div style={{ fontSize: 11, color: "#4b5563" }}>
          Current phases:{" "}
          {phases.map((p, idx) => (
            <span
              key={p + idx}
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid #d1d5db",
                marginRight: 4,
                marginBottom: 2,
                background: "white",
              }}
            >
              {idx + 1}. {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ScenarioStatePanel({
  worldState,
  onUpdateWorldState,
  disabled,
}: {
  worldState: WorldState;
  onUpdateWorldState: (patch: Partial<WorldState>) => void;
  disabled?: boolean;
}) {
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

function TeamAckSummary({
  summary,
}: {
  summary: Record<string, { total: number; ack: number }>;


}) {
  const teamName = (id: string) =>
    TEAMS.find((t) => t.id === id)?.name || id;

  const anyActivity = Object.values(summary).some((v) => v.total > 0);

  return (
    <div
      style={{
        marginBottom: 12,
        padding: 10,
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
        fontSize: 12,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        Team acknowledgement summary
      </div>
      {!anyActivity ? (
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          No sent injects yet for any team.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 4 }}>
          {TEAMS.map((t) => {
            const s = summary[t.id] || { total: 0, ack: 0 };
            const ratio =
              s.total > 0 ? `${s.ack} of ${s.total} acknowledged` : "No injects";
            const pct =
              s.total > 0 ? Math.round((s.ack / s.total) * 100) : 0;
            const barWidth = s.total > 0 ? `${pct}%` : "0%";

            return (
              <div key={t.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    marginBottom: 2,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{teamName(t.id)}</span>
                  <span style={{ color: "#6b7280" }}>{ratio}</span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 999,
                    background: "#e5e7eb",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: barWidth,
                      background: "#22c55e",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

function HotInjectForm({
  onSend,
  disabled,
  phases,
}: {
  onSend: (opts: {
    title: string;
    body: string;
    teamIds: string[];
    objectives?: string[];
    capabilities?: string[];
    phase?: string;
  }) => void;
  disabled: boolean;
  phases: string[];
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([
    TEAMS[0].id,
  ]);
  const [objectivesInput, setObjectivesInput] = useState("");
  const [capabilitiesInput, setCapabilitiesInput] = useState("");
  const [selectedPhase, setSelectedPhase] = useState<string>("");

  const toggleTeam = (id: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const allChecked = selectedTeamIds.length === TEAMS.length;
  const toggleAll = () => {
    if (allChecked) {
      setSelectedTeamIds([]);
    } else {
      setSelectedTeamIds(TEAMS.map((t) => t.id));
    }
  };

  const canSend =
    !disabled && title.trim().length > 0 && selectedTeamIds.length > 0;

  const parseTags = (raw: string) =>
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;

    const objectives = parseTags(objectivesInput);
    const capabilities = parseTags(capabilitiesInput);

    onSend({
      title,
      body,
      teamIds: selectedTeamIds,
      objectives: objectives.length ? objectives : undefined,
      capabilities: capabilities.length ? capabilities : undefined,
      phase: selectedPhase || undefined,
    });

    setTitle("");
    setBody("");
    setObjectivesInput("");
    setCapabilitiesInput("");
    setSelectedPhase("");
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
      <input
        placeholder="Inject title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{
          borderRadius: 999,
          border: "1px solid #d1d5db",
          padding: "8px 12px",
          backgroundColor: disabled ? "#f9fafb" : "white",
        }}
        disabled={disabled}
      />
      <textarea
        placeholder="Message body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        style={{
          borderRadius: 12,
          border: "1px solid #d1d5db",
          padding: "8px 12px",
          backgroundColor: disabled ? "#f9fafb" : "white",
        }}
        disabled={disabled}
      />

      <input
        placeholder="Objectives (comma-separated, e.g. Detection, Coordination)"
        value={objectivesInput}
        onChange={(e) => setObjectivesInput(e.target.value)}
        style={{
          borderRadius: 999,
          border: "1px solid #d1d5db",
          padding: "6px 12px",
          fontSize: 12,
          backgroundColor: disabled ? "#f9fafb" : "white",
        }}
        disabled={disabled}
      />
      <input
        placeholder="Capabilities (comma-separated, e.g. Surveillance, Risk comms)"
        value={capabilitiesInput}
        onChange={(e) => setCapabilitiesInput(e.target.value)}
        style={{
          borderRadius: 999,
          border: "1px solid #d1d5db",
          padding: "6px 12px",
          fontSize: 12,
          backgroundColor: disabled ? "#f9fafb" : "white",
        }}
        disabled={disabled}
      />

      {phases.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 12,
          }}
        >
          <span style={{ fontWeight: 500 }}>Phase (optional):</span>
          <select
            value={selectedPhase}
            onChange={(e) => setSelectedPhase(e.target.value)}
            disabled={disabled}
            style={{
              borderRadius: 999,
              border: "1px solid #d1d5db",
              padding: "4px 10px",
              backgroundColor: disabled ? "#f9fafb" : "white",
            }}
          >
            <option value="">No phase</option>
            {phases.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Recipients:</span>

        <label
          style={{
            display: "inline-flex",
            gap: 6,
            alignItems: "center",
            fontSize: 13,
          }}
        >
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            disabled={disabled}
          />
          All teams
        </label>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 2,
          }}
        >
          {TEAMS.map((t) => (
            <label
              key={t.id}
              style={{
                display: "inline-flex",
                gap: 4,
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={selectedTeamIds.includes(t.id)}
                onChange={() => toggleTeam(t.id)}
                disabled={disabled}
              />
              {t.name}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSend}
        style={{
          marginTop: 4,
          padding: "8px 16px",
          borderRadius: 999,
          background: canSend ? "#2563eb" : "#9ca3af",
          color: "white",
          border: "none",
        }}
      >
        Send now
      </button>
    </form>
  );
}

// -------- Scheduled injects UI --------

function ScheduledInjectForm({
  onSchedule,
  disabled,
  phases,
}: {
  onSchedule: (opts: {
    title: string;
    body: string;
    teamIds: string[];
    scheduledFor: string;
    objectives?: string[];
    capabilities?: string[];
    phase?: string;
  }) => void;
  disabled: boolean;
  phases: string[];
}) {
  const [title, setTitle] = useState("Situation update");
  const [body, setBody] = useState("Spike in ARI cases at district hospital.");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([
    TEAMS[0].id,
  ]);
  const [objectivesInput, setObjectivesInput] = useState(
    "Test early detection"
  );
  const [capabilitiesInput, setCapabilitiesInput] = useState(
    "Surveillance, Coordination"
  );
  const [selectedPhase, setSelectedPhase] = useState<string>("");

  const toggleTeam = (id: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const allChecked = selectedTeamIds.length === TEAMS.length;
  const toggleAll = () => {
    if (allChecked) {
      setSelectedTeamIds([]);
    } else {
      setSelectedTeamIds(TEAMS.map((t) => t.id));
    }
  };

  const defaultWhen = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 10);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);

  const [when, setWhen] = useState<string>(defaultWhen);

  const canSchedule =
    !disabled &&
    title.trim().length > 0 &&
    when &&
    selectedTeamIds.length > 0;

  const parseTags = (raw: string) =>
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const schedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSchedule) return;
    const iso = new Date(when).toISOString();

    const objectives = parseTags(objectivesInput);
    const capabilities = parseTags(capabilitiesInput);

    onSchedule({
      title,
      body,
      teamIds: selectedTeamIds,
      scheduledFor: iso,
      objectives: objectives.length ? objectives : undefined,
      capabilities: capabilities.length ? capabilities : undefined,
      phase: selectedPhase || undefined,
    });
  };

  return (
    <form onSubmit={schedule} style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1.3fr 1fr" }}>
        <input
          placeholder="Inject title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            borderRadius: 999,
            border: "1px solid #d1d5db",
            padding: "8px 12px",
            backgroundColor: disabled ? "#f9fafb" : "white",
          }}
          disabled={disabled}
        />
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          style={{
            borderRadius: 999,
            border: "1px solid #d1d5db",
            padding: "8px 12px",
            backgroundColor: disabled ? "#f9fafb" : "white",
          }}
          disabled={disabled}
        />
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        style={{
          borderRadius: 12,
          border: "1px solid #d1d5db",
          padding: "8px 12px",
          backgroundColor: disabled ? "#f9fafb" : "white",
        }}
        disabled={disabled}
      />

      <input
        placeholder="Objectives (comma-separated)"
        value={objectivesInput}
        onChange={(e) => setObjectivesInput(e.target.value)}
        style={{
          borderRadius: 999,
          border: "1px solid #d1d5db",
          padding: "6px 12px",
          fontSize: 12,
          backgroundColor: disabled ? "#f9fafb" : "white",
        }}
        disabled={disabled}
      />
      <input
        placeholder="Capabilities (comma-separated)"
        value={capabilitiesInput}
        onChange={(e) => setCapabilitiesInput(e.target.value)}
        style={{
          borderRadius: 999,
          border: "1px solid #d1d5db",
          padding: "6px 12px",
          fontSize: 12,
          backgroundColor: disabled ? "#f9fafb" : "white",
        }}
        disabled={disabled}
      />

      {phases.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 12,
          }}
        >
          <span style={{ fontWeight: 500 }}>Phase (optional):</span>
          <select
            value={selectedPhase}
            onChange={(e) => setSelectedPhase(e.target.value)}
            disabled={disabled}
            style={{
              borderRadius: 999,
              border: "1px solid #d1d5db",
              padding: "4px 10px",
              backgroundColor: disabled ? "#f9fafb" : "white",
            }}
          >
            <option value="">No phase</option>
            {phases.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Recipients:</span>

        <label
          style={{
            display: "inline-flex",
            gap: 6,
            alignItems: "center",
            fontSize: 13,
          }}
        >
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            disabled={disabled}
          />
          All teams
        </label>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 2,
          }}
        >
          {TEAMS.map((t) => (
            <label
              key={t.id}
              style={{
                display: "inline-flex",
                gap: 4,
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={selectedTeamIds.includes(t.id)}
                onChange={() => toggleTeam(t.id)}
                disabled={disabled}
              />
              {t.name}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSchedule}
        style={{
          marginTop: 4,
          padding: "8px 16px",
          borderRadius: 999,
          background: canSchedule ? "#4f46e5" : "#9ca3af",
          color: "white",
          border: "none",
        }}
      >
        Schedule
      </button>
    </form>
  );
}

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

// -------- Sent inject list (with 30s recall window + ack summary) --------

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

