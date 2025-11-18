import React from "react";
import { TEAMS } from "../constants";
import { TimelineEvent } from "../types";

export default function Timeline({ timeline }: { timeline: TimelineEvent[] }) {
  if (!timeline.length) {
    return (
      <div style={{ fontSize: 12, color: "#6b7280" }}>No events.</div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {timeline.map((e) => (
        <div
          key={e.id}
          style={{
            padding: 8,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: backgroundForEvent(e.type),
          }}
        >
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            {new Date(e.ts).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>
            {labelForEvent(e)}
          </div>
          {(e.objectives?.length || e.capabilities?.length) && (
            <div
              style={{
                marginTop: 2,
                fontSize: 11,
                color: "#4b5563",
                whiteSpace: "pre-wrap",
              }}
            >
              {e.objectives?.length ? `Obj: ${e.objectives.join("; ")}` : ""}
              {e.objectives?.length && e.capabilities?.length ? " • " : ""}
              {e.capabilities?.length
                ? `Cap: ${e.capabilities.join("; ")}`
                : ""}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function backgroundForEvent(type: string) {
  if (type === "inject.sent" || type === "inject.sent.group") return "#eff6ff";
  if (type === "inject.queued" || type === "inject.queued.group")
    return "#eef2ff";
  if (type === "inject.recalled") return "#fffbeb";
  if (type === "exercise.started") return "#e0f2fe";
  if (type === "exercise.ended") return "#fee2e2";
  if (type === "exercise.paused") return "#fef3c7";
  if (type === "exercise.resumed") return "#dcfce7";
  if (type === "inject.acknowledged") return "#ecfdf5";
  return "white";
}

function formatRecipientsList(recips: string[] | undefined, allFlag?: boolean) {
  if (!recips || recips.length === 0) return "";
  const names = recips
    .map((id) => TEAMS.find((t) => t.id === id)?.name || id)
    .join(", ");
  if (allFlag && recips.length === TEAMS.length) {
    return "All teams";
  }
  return names;
}

function labelForEvent(e: TimelineEvent) {
  const teamName = (id?: string) => TEAMS.find((t) => t.id === id)?.name || id;

  if (e.type === "inject.queued.group") {
    const tgt = e.recipients
      ? formatRecipientsList(e.recipients, e.all)
      : "Multiple teams";
    const when = e.scheduledAt
      ? new Date(e.scheduledAt).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    return `Inject scheduled: ${e.title} → ${tgt}${
      when ? ` (fires at ${when})` : ""
    }`;
  }

  if (e.type === "inject.queued") {
    const when = e.scheduledAt
      ? new Date(e.scheduledAt).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    return `Inject scheduled: ${e.title} → ${teamName(e.teamId)}${
      when ? ` (fires at ${when})` : ""
    }`;
  }

  if (e.type === "inject.sent.group") {
    const tgt = e.recipients
      ? formatRecipientsList(e.recipients, e.all)
      : "Multiple teams";
    return `Inject sent: ${e.title} → ${tgt}`;
  }

  if (e.type === "inject.sent") {
    return `Inject sent: ${e.title} → ${teamName(e.teamId)}`;
  }

  if (e.type === "inject.recalled") return "Inject recalled";
  if (e.type === "exercise.started") return "Exercise started";
  if (e.type === "exercise.ended") return "Exercise ended";
  if (e.type === "exercise.paused") return "Exercise paused";
  if (e.type === "exercise.resumed") return "Exercise resumed";

  if (e.type === "inject.acknowledged") {
    const actor = e.actorName || teamName(e.teamId);
    return `Inject acknowledged: ${e.title} (${actor})`;
  }

  return e.type;
}
