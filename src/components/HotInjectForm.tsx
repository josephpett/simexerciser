import React, { useState } from "react";
import { TEAMS } from "../constants";

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

export default HotInjectForm;

// -------- Scheduled injects UI --------

