import React from "react";
import { EvaluationRating, MeltRow } from "../types";

export default function MeltTable({
  rows,
  onSelectInject,
}: {
  rows: MeltRow[];
  onSelectInject?: (injectId: string) => void;
}) {
  if (!rows.length) {
    return (
      <div style={{ fontSize: 12, color: "#6b7280" }}>
        No injects yet to show in MELT.
      </div>
    );
  }

  const ratingShortLabel = (r?: EvaluationRating) => {
    if (!r) return "—";
    if (r === "not_observed") return "Not observed";
    if (r === "partially") return "Partially";
    if (r === "achieved") return "Achieved";
    if (r === "exceeded") return "Exceeded";
    return "—";
  };

  const ackCell = (ackCount?: number, totalTargets?: number) => {
    if (
      typeof totalTargets !== "number" ||
      totalTargets <= 0 ||
      typeof ackCount !== "number"
    ) {
      return "—";
    }
    if (ackCount <= 0) {
      return "🔘 None";
    }
    if (ackCount < totalTargets) {
      return `🟡 ${ackCount}/${totalTargets} teams`;
    }
    // ackCount === totalTargets
    if (totalTargets === 1) {
      return "🟢 Acknowledged";
    }
    return `🟢 All (${ackCount}/${totalTargets})`;
  };

  return (
    <div
      style={{
        fontSize: 11,
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "0.9fr 1.3fr 0.9fr 1.2fr 0.7fr 1.2fr 1.1fr",
          fontWeight: 600,
          background: "#f9fafb",
          padding: "6px 8px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div>When</div>
        <div>Inject</div>
        <div>Phase</div>
        <div>Targets</div>
        <div>Status</div>
        <div>Acknowledgements</div>
        <div>Evaluation</div>
      </div>
      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {rows.map((r) => (
          <div
            key={r.id}
            onClick={() => onSelectInject && onSelectInject(r.injectId)}
            style={{
              display: "grid",
              gridTemplateColumns:
                "0.9fr 1.3fr 0.9fr 1.2fr 0.7fr 1.2fr 1.1fr",
              padding: "6px 8px",
              borderBottom: "1px solid #f3f4f6",
              cursor: onSelectInject ? "pointer" : "default",
            }}
          >
            <div style={{ whiteSpace: "nowrap" }}>{r.whenLabel}</div>
            <div style={{ paddingRight: 6 }}>
              <div style={{ fontWeight: 500 }}>{r.title}</div>
              {(r.objectives?.length || r.capabilities?.length) && (
                <div
                  style={{
                    marginTop: 2,
                    color: "#4b5563",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {r.objectives?.length
                    ? `Obj: ${r.objectives.join("; ")}`
                    : ""}
                  {r.objectives?.length && r.capabilities?.length ? " • " : ""}
                  {r.capabilities?.length
                    ? `Cap: ${r.capabilities.join("; ")}`
                    : ""}
                </div>
              )}
            </div>
            <div style={{ paddingRight: 6 }}>
              {r.phase ? r.phase : "—"}
            </div>
            <div style={{ paddingRight: 6 }}>{r.targets}</div>
            <div style={{ textTransform: "capitalize" }}>{r.status}</div>
            <div>{ackCell(r.ackCount, r.totalTargets)}</div>
            <div>{ratingShortLabel(r.evaluationRating)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
