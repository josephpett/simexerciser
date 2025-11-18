import React, { useState } from "react";
import { TEAMS } from "../constants";

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

export default ScheduledInjectForm;

