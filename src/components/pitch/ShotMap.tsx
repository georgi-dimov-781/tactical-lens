import { useState } from "react";
import type { ShotEvent } from "@/lib/types";

export type AnnotatedShot = ShotEvent & { matchLabel: string };

const GOAL_COLOR = "#f59e0b";
const SAVE_COLOR = "#60a5fa";
const MISS_COLOR = "rgba(148,163,184,0.55)";

function shotColor(shot: ShotEvent, accentColor?: string) {
  if (shot.outcome === "Goal") return GOAL_COLOR;
  if (shot.outcome === "Saved") return accentColor ?? SAVE_COLOR;
  return MISS_COLOR;
}

interface ShotMapProps {
  shots: AnnotatedShot[];
  accentColor?: string; // color for non-goal shots
  label?: string;
}

export function ShotMap({ shots, accentColor, label }: ShotMapProps) {
  const [hovered, setHovered] = useState<AnnotatedShot | null>(null);

  const VW = 420, VH = 280;
  const PAD = { top: 12, right: 12, bottom: 12, left: 12 };
  const W = VW - PAD.left - PAD.right;
  const H = VH - PAD.top - PAD.bottom;

  function sx(x: number) { return PAD.left + ((x - 60) / 60) * W; }
  function sy(y: number) { return PAD.top + (y / 80) * H; }

  const goals = shots.filter((s) => s.outcome === "Goal").length;

  return (
    <div style={{ position: "relative" }}>
      {label && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label} · {shots.length} shots · {goals} goal{goals !== 1 ? "s" : ""}
        </div>
      )}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        style={{ display: "block", background: "#1a3d1a", borderRadius: 10, aspectRatio: `${VW}/${VH}` }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <pattern id={`sg-${label}`} x="0" y="0" width="10" height="280" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="10" height="280" fill="#1a3d1a" />
            <rect x="0" y="0" width="5" height="280" fill="#1e4520" />
          </pattern>
        </defs>
        <rect width={VW} height={VH} fill={`url(#sg-${label})`} rx="10" />

        {/* Pitch lines */}
        <rect x={PAD.left} y={PAD.top} width={W} height={H} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + H} stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" />
        <rect x={sx(102)} y={sy(18)} width={sx(120)-sx(102)} height={sy(62)-sy(18)} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" />
        <rect x={sx(114)} y={sy(30)} width={sx(120)-sx(114)} height={sy(50)-sy(30)} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" />
        <rect x={sx(120)-2} y={sy(36)} width={4} height={sy(44)-sy(36)} fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <circle cx={sx(108)} cy={sy(40)} r={1.5} fill="rgba(255,255,255,0.4)" />
        <path d={`M ${sx(102)} ${sy(29.8)} A ${(10/60)*W} ${(10/80)*H} 0 0 1 ${sx(102)} ${sy(50.2)}`} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" />

        {shots.map((shot, i) => {
          if (!shot.location) return null;
          const [x, y] = shot.location;
          if (x < 55) return null;
          const r = Math.max(3, Math.sqrt(shot.xg || 0) * 9);
          const c = shotColor(shot, accentColor);
          const isGoal = shot.outcome === "Goal";
          return (
            <circle
              key={i}
              cx={sx(x)} cy={sy(y)} r={r}
              fill={c}
              fillOpacity={isGoal ? 0.9 : 0.5}
              stroke={isGoal ? "#fff" : c}
              strokeWidth={isGoal ? 1.5 : 0.5}
              strokeOpacity={0.7}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(shot)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>

      <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.4)", flexWrap: "wrap" }}>
        {[["Goal", GOAL_COLOR], ["Saved", accentColor ?? SAVE_COLOR], ["Off target", MISS_COLOR]].map(([lbl, c]) => (
          <div key={lbl as string} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c as string }} />
            {lbl}
          </div>
        ))}
      </div>

      {hovered && (
        <div style={{
          position: "absolute", top: 8, left: 8,
          background: "rgba(10,10,20,0.95)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "white",
          pointerEvents: "none", zIndex: 10, maxWidth: 180,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 3, color: hovered.outcome === "Goal" ? GOAL_COLOR : "white" }}>
            {hovered.outcome}
          </div>
          <div style={{ color: "rgba(255,255,255,0.45)", marginBottom: 2, fontSize: 10 }}>{hovered.matchLabel}</div>
          <div>xG <span style={{ color: GOAL_COLOR }}>{(hovered.xg || 0).toFixed(3)}</span></div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 2 }}>
            {(hovered as any).bodyPart} · {(hovered as any).technique}
          </div>
        </div>
      )}
    </div>
  );
}
