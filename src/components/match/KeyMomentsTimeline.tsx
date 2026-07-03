import { useState } from "react";

export interface KeyMoments {
  goals: Array<{ minute: number; second: number; team: string; scorer: string; xg: number }>;
  bigChances: Array<{ minute: number; second: number; team: string; player: string; xg: number; outcome: string }>;
  substitutions: Array<{ minute: number; second: number; team: string; playerOut: string; playerIn: string; reason: string }>;
  cards: Array<{ minute: number; second: number; team: string; player: string; cardType: string }>;
}

interface KeyMomentsTimelineProps {
  moments: KeyMoments;
  homeTeam: string;
  awayTeam: string;
  maxMinute?: number;
}

type MomentType = "goal" | "chance" | "sub" | "card";

interface Moment {
  minute: number;
  second: number;
  type: MomentType;
  team: string;
  label: string;
  detail: string;
  color: string;
  icon: string;
}

const HOME_COLOR = "#4ade80";
const AWAY_COLOR = "#60a5fa";
const GOAL_COLOR = "#f59e0b";
const CARD_YELLOW = "#fbbf24";
const CARD_RED = "#ef4444";
const CHANCE_HOME = "rgba(74,222,128,0.7)";
const CHANCE_AWAY = "rgba(96,165,250,0.7)";
const SUB_COLOR = "#a78bfa";

function momentColor(m: Moment, isHome: boolean) {
  if (m.type === "goal") return GOAL_COLOR;
  if (m.type === "card") return m.detail.includes("Red") ? CARD_RED : CARD_YELLOW;
  if (m.type === "sub") return SUB_COLOR;
  return isHome ? CHANCE_HOME : CHANCE_AWAY;
}

export function KeyMomentsTimeline({ moments, homeTeam, awayTeam, maxMinute = 90 }: KeyMomentsTimelineProps) {
  const [hovered, setHovered] = useState<Moment | null>(null);
  const [filter, setFilter] = useState<MomentType | "all">("all");

  // Flatten all moments into one sorted list
  const all: Moment[] = [
    ...moments.goals.map((g) => ({
      minute: g.minute, second: g.second,
      type: "goal" as MomentType,
      team: g.team,
      label: `${g.minute}'`,
      detail: `⚽ ${g.scorer} (${g.xg.toFixed(2)} xG)`,
      color: GOAL_COLOR,
      icon: "⚽",
    })),
    ...moments.bigChances.map((c) => ({
      minute: c.minute, second: c.second,
      type: "chance" as MomentType,
      team: c.team,
      label: `${c.minute}'`,
      detail: `${c.player} — ${c.outcome} (${c.xg.toFixed(2)} xG)`,
      color: c.team === homeTeam ? CHANCE_HOME : CHANCE_AWAY,
      icon: "◎",
    })),
    ...moments.substitutions.map((s) => ({
      minute: s.minute, second: s.second,
      type: "sub" as MomentType,
      team: s.team,
      label: `${s.minute}'`,
      detail: `↓ ${s.playerOut}  ↑ ${s.playerIn}${s.reason === "Injury" ? " (inj.)" : ""}`,
      color: SUB_COLOR,
      icon: "↕",
    })),
    ...moments.cards.map((c) => ({
      minute: c.minute, second: c.second,
      type: "card" as MomentType,
      team: c.team,
      label: `${c.minute}'`,
      detail: `${c.cardType} — ${c.player}`,
      color: c.cardType.includes("Red") ? CARD_RED : CARD_YELLOW,
      icon: c.cardType.includes("Red") ? "🟥" : "🟨",
    })),
  ].sort((a, b) => a.minute * 60 + a.second - (b.minute * 60 + b.second));

  const visible = filter === "all" ? all : all.filter((m) => m.type === filter);

  // Full match duration: include ET if any events go past 90
  const duration = Math.max(maxMinute, ...all.map((m) => m.minute)) + 5;

  function xPct(minute: number, second: number) {
    return ((minute * 60 + second) / (duration * 60)) * 100;
  }

  const filterButtons: Array<{ key: MomentType | "all"; label: string; color: string }> = [
    { key: "all", label: "All", color: "rgba(255,255,255,0.5)" },
    { key: "goal", label: "⚽ Goals", color: GOAL_COLOR },
    { key: "chance", label: "◎ Chances", color: HOME_COLOR },
    { key: "sub", label: "↕ Subs", color: SUB_COLOR },
    { key: "card", label: "🟨 Cards", color: CARD_YELLOW },
  ];

  // Separate home vs away for upper/lower lane
  const homeEvents = visible.filter((m) => m.team === homeTeam);
  const awayEvents = visible.filter((m) => m.team === awayTeam);

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {filterButtons.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: "4px 12px",
              borderRadius: 20,
              border: `1px solid ${filter === key ? color : "rgba(255,255,255,0.1)"}`,
              background: filter === key ? `${color}18` : "transparent",
              color: filter === key ? color : "rgba(255,255,255,0.4)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.25)", alignSelf: "center" }}>
          {visible.length} moment{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Timeline SVG */}
      <div style={{ position: "relative", userSelect: "none" }}>
        <svg
          viewBox="0 0 100 28"
          width="100%"
          preserveAspectRatio="none"
          style={{ display: "block", height: 100, overflow: "visible" }}
          onMouseLeave={() => setHovered(null)}
        >
          {/* Background track */}
          <rect x="0" y="13" width="100" height="2" rx="1" fill="rgba(255,255,255,0.07)" />

          {/* Halftime marker */}
          <line x1={xPct(45, 0)} y1="5" x2={xPct(45, 0)} y2="23" stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" strokeDasharray="0.6 0.6" />
          <text x={xPct(45, 0)} y="27" textAnchor="middle" fontSize="2" fill="rgba(255,255,255,0.2)" fontFamily="Inter,sans-serif">HT</text>

          {/* ET marker if needed */}
          {duration > 95 && (
            <>
              <line x1={xPct(90, 0)} y1="5" x2={xPct(90, 0)} y2="23" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" strokeDasharray="0.6 0.6" />
              <text x={xPct(90, 0)} y="27" textAnchor="middle" fontSize="2" fill="rgba(255,255,255,0.2)" fontFamily="Inter,sans-serif">FT</text>
            </>
          )}

          {/* Minute tick marks */}
          {[0, 15, 30, 45, 60, 75, 90].map((m) => (
            <g key={m}>
              <line x1={xPct(m, 0)} y1="13.8" x2={xPct(m, 0)} y2="15.2" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
              {m > 0 && (
                <text x={xPct(m, 0)} y="18.5" textAnchor="middle" fontSize="1.9" fill="rgba(255,255,255,0.2)" fontFamily="Inter,sans-serif">{m}'</text>
              )}
            </g>
          ))}

          {/* HOME team events — above the track */}
          {homeEvents.map((m, i) => {
            const x = xPct(m.minute, m.second);
            const isGoal = m.type === "goal";
            const isCard = m.type === "card";
            const color = momentColor(m, true);
            return (
              <g
                key={`h${i}`}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(m)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Stem */}
                <line x1={x} y1="10" x2={x} y2="13" stroke={color} strokeWidth={isGoal ? "0.6" : "0.4"} strokeOpacity="0.8" />
                {/* Dot */}
                <circle
                  cx={x} cy={isGoal ? 8.5 : 10}
                  r={isGoal ? 2.2 : isCard ? 1.5 : 1.4}
                  fill={color}
                  fillOpacity={isGoal ? 1 : 0.85}
                  stroke={isGoal ? "rgba(255,255,255,0.6)" : "none"}
                  strokeWidth="0.4"
                />
                {/* Minute label for goals */}
                {isGoal && (
                  <text x={x} y={8.7} textAnchor="middle" fontSize="1.5" fill="white" fontFamily="Inter,sans-serif" fontWeight="700">
                    {m.minute}'
                  </text>
                )}
              </g>
            );
          })}

          {/* AWAY team events — below the track */}
          {awayEvents.map((m, i) => {
            const x = xPct(m.minute, m.second);
            const isGoal = m.type === "goal";
            const isCard = m.type === "card";
            const color = momentColor(m, false);
            return (
              <g
                key={`a${i}`}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(m)}
                onMouseLeave={() => setHovered(null)}
              >
                <line x1={x} y1="15" x2={x} y2="18" stroke={color} strokeWidth={isGoal ? "0.6" : "0.4"} strokeOpacity="0.8" />
                <circle
                  cx={x} cy={isGoal ? 19.5 : 18}
                  r={isGoal ? 2.2 : isCard ? 1.5 : 1.4}
                  fill={color}
                  fillOpacity={isGoal ? 1 : 0.85}
                  stroke={isGoal ? "rgba(255,255,255,0.6)" : "none"}
                  strokeWidth="0.4"
                />
                {isGoal && (
                  <text x={x} y={19.7} textAnchor="middle" fontSize="1.5" fill="white" fontFamily="Inter,sans-serif" fontWeight="700">
                    {m.minute}'
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Team labels flanking track */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: -8 }}>
          <span style={{ fontSize: 10, color: HOME_COLOR, fontWeight: 600 }}>{homeTeam} ▲</span>
          <span style={{ fontSize: 10, color: AWAY_COLOR, fontWeight: 600 }}>▼ {awayTeam}</span>
        </div>

        {/* Tooltip */}
        {hovered && (
          <div style={{
            position: "absolute",
            top: -48,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(10,10,20,0.97)",
            border: `1px solid ${momentColor(hovered, hovered.team === homeTeam)}44`,
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 12,
            color: "white",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 20,
          }}>
            <span style={{ color: momentColor(hovered, hovered.team === homeTeam), marginRight: 6 }}>{hovered.icon}</span>
            <strong>{hovered.label}</strong>
            <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.7)" }}>{hovered.detail}</span>
          </div>
        )}
      </div>

      {/* Scrollable event list */}
      {visible.length > 0 && (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
          {visible.map((m, i) => {
            const isHome = m.team === homeTeam;
            const color = momentColor(m, isHome);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  flexDirection: isHome ? "row" : "row-reverse",
                }}
              >
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", width: 28, textAlign: "center", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  {m.minute}'
                </span>
                <span style={{ fontSize: 13 }}>{m.icon}</span>
                <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: isHome ? "left" : "right" }}>
                  {m.detail}
                </span>
                <span style={{ fontSize: 10, color, fontWeight: 600, flexShrink: 0 }}>
                  {m.team}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: "rgba(255,255,255,0.2)" }}>
          No {filter === "all" ? "" : filter + " "}events to show.
        </div>
      )}
    </div>
  );
}
