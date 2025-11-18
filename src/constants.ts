import { ExerciseDefinition, Inject, Team, WorldState } from "./types";

export const STORAGE_KEY = "simexit_mvp_state_v1";

export const TEAMS: Team[] = [
  { id: "team_eoc", name: "EOC" },
  { id: "team_lab", name: "Lab" },
  { id: "team_comm", name: "Comms" },
  { id: "team_field", name: "Field" },
];

export const DEFAULT_WORLD_STATE: WorldState = {
  epiTrend: "stable",
  commsPressure: 2,
  labBacklog: 1,
  publicAnxiety: 2,
};

export const DEFAULT_EXERCISE: ExerciseDefinition = {
  name: "Untitled exercise",
  type: "tabletop",
  overview: "",
  primaryObjectives: "",
};

export const DEFAULT_PHASES = ["Phase 1", "Phase 2", "Phase 3"];

export const buildEmptyInboxes = (): Record<string, Inject[]> =>
  Object.fromEntries(TEAMS.map((t) => [t.id, []]));

export const parsePhases = (value: string): string[] =>
  value
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
