import { useState } from "react";
import type { GoalBuildUp as GoalBuildUpType } from "@/lib/types";
import { FootballPitch } from "@/components/pitch/FootballPitch";

interface GoalBuildUpProps {
  buildUps: GoalBuildUpType[];
  homeTeam: string;
  awayTeam: string;
}

const EVENT_COLORS: Record<string, string> = {
  Shot: "#f59e0b",
  Pass: "#4ade80",
  Carry: "#60a5fa",
  "Ball Recovery": "#a78bfa",
  Pressure: "#f87171",
  Duel: "#fb923c",
};

function formatTime(minute: number, second?: number) {
  return second !== undefined ? `${minute}:${String(second).padStart(2, "0")}` : `${minute}'`;
}

export function GoalBuildUp({ buildUps, homeTeam, awayTeam }: GoalBuildUpProps) {
  const [selected, setSelected] = useState(0);

  if (!buildUps.length) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
        No goals in this match
      </div>
    );
  }

  const current = buildUps[selected];

  return (
    <div data-testid="goal-buildup">
      {/* Goal selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {buildUps.map((bu, i) => (
          <button
            key={bu.goalEventId}
            onClick={() => setSelected(i)}
            data-testid={`buildup-select-${i}`}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: `1px solid ${selected === i ? "#f59e0b" : "rgba(255,255,255,0.1)"}`,
              background: selected === i ? "rgba(245,158,11,0.15)" : "transparent",
              color: selected === i ? "#f59e0b" : "rgba(255,255,255,0.55)",
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {bu.goalMinute}' — {bu.scorer}
          </button>
        ))}
      </div>

      {/* Two-column: event list + pitch */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        {/* Event list */}
        <div
          style={{
            maxHeight: 320,
            overflowY: "auto",
            background: "rgba(0,0,0,0.2)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {current.events.map((ev, i) => {
            const color = EVENT_COLORS[ev.type] ?? "rgba(255,255,255,0.4)";
            const isGoal = ev.type === "Shot" && ev.outcome === "Goal";
            return (
              <div
                key={ev.id}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "8px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: isGoal ? "rgba(245,158,11,0.08)" : undefined,
                }}
                data-testid={`buildup-event-${i}`}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.35)",
                    width: 36,
                    flexShrink: 0,
                    fontVariantNumeric: "tabular-nums",
                    paddingTop: 1,
                  }}
                >
                  {formatTime(ev.minute, ev.second)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color, fontWeight: isGoal ? 600 : 400 }}>
                    {ev.type}
                    {isGoal && " → ⚽ Goal"}
                    {ev.xg ? ` (xG ${ev.xg.toFixed(2)})` : ""}
                  </div>
                  {ev.player && (
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.player}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pitch overlay */}
        <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
          <FootballPitch height={260}>
            {current.events.map((ev, i) => {
              if (!ev.location) return null;
              const [x, y] = ev.location;
              const color = EVENT_COLORS[ev.type] ?? "rgba(255,255,255,0.5)";
              const isGoal = ev.type === "Shot" && ev.outcome === "Goal";

              return (
                <g key={ev.id}>
                  {/* Line connecting events */}
                  {i > 0 && current.events[i - 1].location && (
                    <line
                      x1={current.events[i - 1].location![0]}
                      y1={current.events[i - 1].location![1]}
                      x2={x}
                      y2={y}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth={0.4}
                      strokeDasharray="1 1"
                    />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={isGoal ? 2.5 : 1.5}
                    fill={color}
                    opacity={isGoal ? 1 : 0.8}
                    stroke={isGoal ? "#f59e0b" : "rgba(255,255,255,0.3)"}
                    strokeWidth={isGoal ? 0.4 : 0.2}
                  />
                  <text
                    x={x}
                    y={y - 2.5}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.6)"
                    fontSize={3}
                    fontFamily="Inter, sans-serif"
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </FootballPitch>
        </div>
      </div>
    </div>
  );
}
