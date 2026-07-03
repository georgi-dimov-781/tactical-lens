import type { MatchSummary } from "@/lib/types";

interface MatchStatsProps {
  summary: MatchSummary;
}

interface StatBarProps {
  label: string;
  homeVal: number | string;
  awayVal: number | string;
  homeRaw?: number;
  awayRaw?: number;
  format?: (v: number) => string;
}

function StatBar({ label, homeVal, awayVal, homeRaw, awayRaw, format }: StatBarProps) {
  const h = homeRaw ?? (typeof homeVal === "number" ? homeVal : 0);
  const a = awayRaw ?? (typeof awayVal === "number" ? awayVal : 0);
  const total = h + a || 1;
  const homePct = (h / total) * 100;

  return (
    <div style={{ marginBottom: 14 }} data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
        <span style={{ color: "#4ade80", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {format ? format(h) : homeVal}
        </span>
        <span style={{ color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10 }}>
          {label}
        </span>
        <span style={{ color: "#60a5fa", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {format ? format(a) : awayVal}
        </span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${homePct}%`,
            background: "linear-gradient(90deg, #4ade80, #22c55e)",
            borderRadius: 2,
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

export function MatchStats({ summary }: MatchStatsProps) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        borderRadius: 10,
        padding: "20px 24px",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      data-testid="match-stats"
    >
      <h3 style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
        Match Stats
      </h3>

      <StatBar
        label="xG"
        homeVal={summary.homeXg.toFixed(2)}
        awayVal={summary.awayXg.toFixed(2)}
        homeRaw={summary.homeXg}
        awayRaw={summary.awayXg}
      />
      <StatBar
        label="Shots"
        homeVal={summary.homeShots ?? 0}
        awayVal={summary.awayShots ?? 0}
      />
      <StatBar
        label="Passes"
        homeVal={summary.homePasses ?? 0}
        awayVal={summary.awayPasses ?? 0}
      />
      <StatBar
        label="Possession"
        homeVal={`${summary.homePossession ?? 50}%`}
        awayVal={`${summary.awayPossession ?? 50}%`}
        homeRaw={summary.homePossession ?? 50}
        awayRaw={summary.awayPossession ?? 50}
      />
    </div>
  );
}
