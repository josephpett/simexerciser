import React from "react";
import { TEAMS } from "../constants";

type TeamAckSummaryProps = {
  summary: Record<string, { total: number; ack: number }>;
};

export default function TeamAckSummary({ summary }: TeamAckSummaryProps) {
  const teamName = (id: string) => TEAMS.find((t) => t.id === id)?.name || id;

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
