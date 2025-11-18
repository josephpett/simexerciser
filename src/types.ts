export type Team = { id: string; name: string };

export type InjectStatus = "queued" | "sent" | "recalled";

export type EvaluationRating = "not_observed" | "partially" | "achieved" | "exceeded";

export type Inject = {
  id: string;
  groupId?: string;
  title: string;
  body: string;
  teamId: string;
  status: InjectStatus;
  ts: string;
  all?: boolean;
  groupMaster?: boolean;
  recipients?: string[];
  scheduledFor?: string;
  objectives?: string[];
  capabilities?: string[];
  evaluationRating?: EvaluationRating;
  evaluationNotes?: string;
  phase?: string;
};

export type TimelineEvent = {
  id: string;
  ts: string;
  type: string;
  title?: string;
  teamId?: string;
  recipients?: string[];
  all?: boolean;
  scheduledAt?: string;
  injectId?: string;
  actorName?: string;
  actionType?: string;
  objectives?: string[];
  capabilities?: string[];
};

export type ParticipantActionType = "acknowledged";

export type ParticipantAction = {
  id: string;
  ts: string;
  injectId: string;
  teamId: string;
  actorName?: string;
  type: ParticipantActionType;
};

export type WorldState = {
  epiTrend?: "stable" | "worsening" | "improving";
  commsPressure?: number;
  labBacklog?: number;
  publicAnxiety?: number;
  [key: string]: any;
};

export type ExerciseType = "tabletop" | "drill" | "functional" | "full-scale";

export type ExerciseDefinition = {
  name: string;
  type: ExerciseType;
  overview: string;
  primaryObjectives: string;
};

export type ExerciseStatus = "draft" | "live" | "ended";

export type MeltRow = {
  id: string;
  injectId: string;
  whenLabel: string;
  whenMs: number;
  title: string;
  targets: string;
  status: string;
  ackCount: number;
  totalTargets: number;
  evaluationRating?: EvaluationRating;
  objectives?: string[];
  capabilities?: string[];
  phase?: string;
};

export type PersistedState = {
  injects?: Inject[];
  inboxes?: Record<string, Inject[]>;
  timeline?: TimelineEvent[];
  paused?: boolean;
  participantTeamId?: string;
  participantTimelineMode?: "team" | "global" | "hidden";
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
