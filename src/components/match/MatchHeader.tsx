import type { MatchSummary } from "@/lib/types";

interface MatchHeaderProps {
  summary: MatchSummary;
}

export function MatchHeader({ summary }: MatchHeaderProps) {
  return (
    <div
      className="w-full"
      data-testid="match-header"
      style={{
        background: "linear-gradient(135deg, rgba(10,10,20,0.95) 0%, rgba(20,30,20,0.95) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "24px 32px",
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {summary.competition} · {summary.season} · {summary.date}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 32, justifyContent: "center" }}>
        {/* Home team */}
        <div style={{ textAlign: "right", flex: 1 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#4ade80",
              letterSpacing: "-0.02em",
            }}
            data-testid="home-team-name"
          >
            {summary.homeTeam}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            xG {summary.homeXg.toFixed(2)}
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
            data-testid="match-score"
          >
            {summary.homeScore}
            <span style={{ color: "rgba(255,255,255,0.25)", margin: "0 8px" }}>–</span>
            {summary.awayScore}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 6, letterSpacing: "0.05em" }}>
            FULL TIME
          </div>
        </div>

        {/* Away team */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#60a5fa",
              letterSpacing: "-0.02em",
            }}
            data-testid="away-team-name"
          >
            {summary.awayTeam}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            xG {summary.awayXg.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
