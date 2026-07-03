import type { Lineup } from "@/lib/types/player";

interface LineupsProps {
  lineups: Lineup[];
  homeTeam: string;
  awayTeam: string;
}

function PositionBadge({ position }: { position?: string | null }) {
  if (!position) return null;
  const abbrev: Record<string, string> = {
    "Goalkeeper": "GK",
    "Right Back": "RB",
    "Left Back": "LB",
    "Right Center Back": "RCB",
    "Left Center Back": "LCB",
    "Center Back": "CB",
    "Right Wing Back": "RWB",
    "Left Wing Back": "LWB",
    "Right Defensive Midfield": "RDM",
    "Left Defensive Midfield": "LDM",
    "Center Defensive Midfield": "CDM",
    "Right Center Midfield": "RCM",
    "Left Center Midfield": "LCM",
    "Center Midfield": "CM",
    "Right Midfield": "RM",
    "Left Midfield": "LM",
    "Right Attacking Midfield": "RAM",
    "Left Attacking Midfield": "LAM",
    "Center Attacking Midfield": "CAM",
    "Right Wing": "RW",
    "Left Wing": "LW",
    "Right Center Forward": "RCF",
    "Left Center Forward": "LCF",
    "Center Forward": "CF",
    "Secondary Striker": "SS",
    "Striker": "ST",
  };
  const short = abbrev[position] ?? position.slice(0, 3).toUpperCase();

  return (
    <span
      style={{
        fontSize: 9,
        padding: "1px 5px",
        borderRadius: 3,
        background: "rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.45)",
        letterSpacing: "0.03em",
        fontWeight: 500,
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {short}
    </span>
  );
}

function TeamColumn({
  lineup,
  color,
  testPrefix,
}: {
  lineup: Lineup;
  color: string;
  testPrefix: string;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {lineup.teamName}
      </div>
      {lineup.players.slice(0, 11).map((p) => (
        <div
          key={p.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 0",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            minWidth: 0,
          }}
          data-testid={`player-${testPrefix}-${p.id}`}
        >
          <span
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              width: 18,
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
            }}
          >
            {p.jerseyNumber}
          </span>
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.85)",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {p.name}
          </span>
          <PositionBadge position={p.position} />
        </div>
      ))}
    </div>
  );
}

export function Lineups({ lineups, homeTeam, awayTeam }: LineupsProps) {
  if (!lineups.length) return null;

  // Sort so home team is always on the left (green)
  const homeLineup = lineups.find((l) => l.teamName === homeTeam) ?? lineups[0];
  const awayLineup = lineups.find((l) => l.teamName === awayTeam) ?? lineups[1];

  if (!homeLineup || !awayLineup) return null;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        borderRadius: 10,
        padding: "20px 24px",
        border: "1px solid rgba(255,255,255,0.06)",
        minWidth: 0,
        overflow: "hidden",
      }}
      data-testid="lineups"
    >
      <h3 style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
        Starting XI
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, minWidth: 0 }}>
        <TeamColumn lineup={homeLineup} color="#4ade80" testPrefix="home" />
        <TeamColumn lineup={awayLineup} color="#60a5fa" testPrefix="away" />
      </div>
    </div>
  );
}
