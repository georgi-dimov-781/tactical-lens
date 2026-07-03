import { useState } from "react";
import type { Lineup } from "@/lib/types/player";

// ─── Position → normalized coords ─────────────────────────────────────────────
// x: 0 = left touchline, 1 = right touchline (from team's own perspective)
// y: 0 = own goal line, 1 = halfway line
const POSITION_COORDS: Record<string, [number, number]> = {
  "Goalkeeper":               [0.50, 0.05],
  "Right Back":               [0.82, 0.20],
  "Left Back":                [0.18, 0.20],
  "Right Center Back":        [0.66, 0.18],
  "Left Center Back":         [0.34, 0.18],
  "Center Back":              [0.50, 0.18],
  "Right Wing Back":          [0.88, 0.36],
  "Left Wing Back":           [0.12, 0.36],
  "Right Defensive Midfield": [0.68, 0.38],
  "Left Defensive Midfield":  [0.32, 0.38],
  "Center Defensive Midfield":[0.50, 0.36],
  "Right Center Midfield":    [0.74, 0.55],
  "Left Center Midfield":     [0.26, 0.55],
  "Center Midfield":          [0.50, 0.52],
  "Right Midfield":           [0.82, 0.52],
  "Left Midfield":            [0.18, 0.52],
  "Right Attacking Midfield": [0.68, 0.70],
  "Left Attacking Midfield":  [0.32, 0.70],
  "Center Attacking Midfield":[0.50, 0.68],
  "Right Wing":               [0.88, 0.80],
  "Left Wing":                [0.12, 0.80],
  "Right Center Forward":     [0.65, 0.86],
  "Left Center Forward":      [0.35, 0.86],
  "Center Forward":           [0.50, 0.88],
  "Secondary Striker":        [0.50, 0.78],
  "Striker":                  [0.50, 0.88],
};

function toHomeCoords([nx, ny]: [number, number]): [number, number] {
  return [nx * 120, 80 - ny * 40];
}
function toAwayCoords([nx, ny]: [number, number]): [number, number] {
  return [(1 - nx) * 120, ny * 40];
}

// Show only the last word of the name (typically the last name), capped at 11 chars
function shortLabel(fullName: string): string {
  const parts = fullName.trim().split(" ");
  // For compound surnames or long names, just take the last segment
  const last = parts[parts.length - 1];
  return last.length > 11 ? last.slice(0, 10) + "…" : last;
}

// ─── Single player dot ────────────────────────────────────────────────────────
interface PlayerDotProps {
  cx: number;
  cy: number;
  jerseyNumber?: number;
  name: string;
  position?: string | null;
  color: string;
  labelBelow: boolean;
  onHover: (info: { name: string; position: string | null | undefined; jersey: number | undefined } | null) => void;
}

function PlayerDot({ cx, cy, jerseyNumber, name, position, color, labelBelow, onHover }: PlayerDotProps) {
  const R = 3.4;
  const labelOffset = labelBelow ? R + 3.8 : -(R + 2.6);
  const label = shortLabel(name);
  // Estimate text width for the pill background
  const pillW = Math.max(label.length * 1.45, 10);
  const pillH = 3.6;

  return (
    <g
      style={{ cursor: "pointer" }}
      onMouseEnter={() => onHover({ name, position, jersey: jerseyNumber })}
      onMouseLeave={() => onHover(null)}
    >
      {/* Shadow */}
      <circle cx={cx} cy={cy + 0.4} r={R + 0.5} fill="rgba(0,0,0,0.4)" />
      {/* Main circle */}
      <circle cx={cx} cy={cy} r={R} fill={color} stroke="rgba(255,255,255,0.8)" strokeWidth={0.6} />
      {/* Jersey number */}
      <text
        x={cx} y={cy + 1.2}
        textAnchor="middle"
        fontSize={2.5}
        fontWeight={700}
        fill="white"
        fontFamily="Inter, sans-serif"
        style={{ pointerEvents: "none" }}
      >
        {jerseyNumber}
      </text>
      {/* Label pill background */}
      <rect
        x={cx - pillW / 2}
        y={labelBelow ? cy + labelOffset - pillH + 0.6 : cy + labelOffset - 0.6}
        width={pillW}
        height={pillH}
        rx={1.4}
        fill="rgba(0,0,0,0.62)"
        style={{ pointerEvents: "none" }}
      />
      {/* Name label */}
      <text
        x={cx} y={cy + labelOffset + (labelBelow ? 0 : pillH - 2.4)}
        textAnchor="middle"
        fontSize={2.1}
        fontWeight={600}
        fill="rgba(255,255,255,0.95)"
        fontFamily="Inter, sans-serif"
        style={{ pointerEvents: "none" }}
      >
        {label}
      </text>
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface FormationPitchProps {
  lineups: Lineup[];
  homeTeam: string;
  awayTeam: string;
}

export function FormationPitch({ lineups, homeTeam, awayTeam }: FormationPitchProps) {
  const [hovered, setHovered] = useState<{ name: string; position: string | null | undefined; jersey: number | undefined } | null>(null);

  const home = lineups.find((l) => l.teamName === homeTeam) ?? lineups[0];
  const away = lineups.find((l) => l.teamName === awayTeam) ?? lineups[1];

  if (!home || !away) return null;

  const starters = (lineup: Lineup) => {
    const withPos = lineup.players.filter(
      (p) => p.position && POSITION_COORDS[p.position]
    );
    return withPos.slice(0, 11);
  };

  const HOME_COLOR = "#16a34a";
  const AWAY_COLOR = "#2563eb";
  const HOME_BADGE = "#4ade80";
  const AWAY_BADGE = "#60a5fa";

  // Stagger players that land on the exact same coordinate slot
  function placeTeam(
    players: typeof home.players,
    toCoords: (n: [number, number]) => [number, number]
  ) {
    const usedSlots = new Map<string, number>();
    return players.map((p) => {
      const base = POSITION_COORDS[p.position ?? ""] ?? [0.5, 0.5];
      const key = `${base[0].toFixed(2)},${base[1].toFixed(2)}`;
      const count = usedSlots.get(key) ?? 0;
      usedSlots.set(key, count + 1);
      // Stagger duplicates horizontally (alternating left/right)
      const nudgeX = count === 0 ? 0 : count % 2 === 1 ? 6 : -6;
      const nudgeY = count >= 3 ? 4 : 0;
      const [nx, ny] = base;
      return { player: p, coords: toCoords([nx + nudgeX / 120, ny + nudgeY / 80]) };
    });
  }

  const homePlaced = placeTeam(starters(home), toHomeCoords);
  const awayPlaced = placeTeam(starters(away), toAwayCoords);

  return (
    <div style={{ position: "relative" }}>
      {/* Team name badges */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: HOME_BADGE }}>{homeTeam}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: AWAY_BADGE }}>{awayTeam}</span>
      </div>

      <svg
        viewBox="0 0 120 80"
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", aspectRatio: "120/80" }}
      >
        <defs>
          <pattern id="fp-grass" x="0" y="0" width="10" height="80" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="10" height="80" fill="#1a3d1a" />
            <rect x="0" y="0" width="5" height="80" fill="#1e4520" />
          </pattern>
          <filter id="fp-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Grass */}
        <rect x="0" y="0" width="120" height="80" fill="url(#fp-grass)" />

        {/* Pitch markings */}
        <rect x="0" y="0" width="120" height="80" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <line x1="60" y1="0" x2="60" y2="80" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <circle cx="60" cy="40" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <circle cx="60" cy="40" r="0.5" fill="rgba(255,255,255,0.4)" />
        {/* Left penalty box */}
        <rect x="0" y="18" width="18" height="44" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <rect x="0" y="30" width="6" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <rect x="0" y="36" width="1.5" height="8" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.4" />
        <circle cx="12" cy="40" r="0.4" fill="rgba(255,255,255,0.4)" />
        <path d="M 18 31.8 A 10 10 0 0 0 18 48.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        {/* Right penalty box */}
        <rect x="102" y="18" width="18" height="44" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <rect x="114" y="30" width="6" height="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <rect x="118.5" y="36" width="1.5" height="8" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.4" />
        <circle cx="108" cy="40" r="0.4" fill="rgba(255,255,255,0.4)" />
        <path d="M 102 31.8 A 10 10 0 0 1 102 48.2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        {/* Corner arcs */}
        <path d="M 0 2 A 2 2 0 0 1 2 0" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <path d="M 118 0 A 2 2 0 0 1 120 2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <path d="M 0 78 A 2 2 0 0 0 2 80" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <path d="M 118 80 A 2 2 0 0 0 120 78" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />

        {/* Direction arrows */}
        <text x="60" y="74" fontSize="2.6" fill="rgba(255,255,255,0.15)" textAnchor="middle" fontFamily="Inter,sans-serif">▲ attacking</text>
        <text x="60" y="8.5" fontSize="2.6" fill="rgba(255,255,255,0.15)" textAnchor="middle" fontFamily="Inter,sans-serif">▼ attacking</text>

        {/* Away team (top half) */}
        {awayPlaced.map(({ player, coords: [cx, cy] }, i) => (
          <PlayerDot
            key={`away-${i}`}
            cx={cx} cy={cy}
            jerseyNumber={player.jerseyNumber}
            name={player.name}
            position={player.position}
            color={AWAY_COLOR}
            labelBelow={false}
            onHover={setHovered}
          />
        ))}

        {/* Home team (bottom half) */}
        {homePlaced.map(({ player, coords: [cx, cy] }, i) => (
          <PlayerDot
            key={`home-${i}`}
            cx={cx} cy={cy}
            jerseyNumber={player.jerseyNumber}
            name={player.name}
            position={player.position}
            color={HOME_COLOR}
            labelBelow={true}
            onHover={setHovered}
          />
        ))}
      </svg>

      {/* Hover tooltip — full name + position */}
      {hovered && (
        <div style={{
          position: "absolute",
          bottom: 40, left: "50%", transform: "translateX(-50%)",
          background: "rgba(10,10,20,0.97)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8,
          padding: "8px 16px",
          fontSize: 12,
          color: "white",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>#{hovered.jersey}</span>
          <span style={{ fontWeight: 600 }}>{hovered.name}</span>
          {hovered.position && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", padding: "2px 7px", background: "rgba(255,255,255,0.07)", borderRadius: 4 }}>
              {hovered.position}
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginTop: 12, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: HOME_COLOR, border: "1px solid rgba(255,255,255,0.4)" }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{homeTeam}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: AWAY_COLOR, border: "1px solid rgba(255,255,255,0.4)" }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{awayTeam}</span>
        </div>
      </div>
    </div>
  );
}
