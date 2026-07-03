import { useState } from "react";
import type { MatchEvent } from "@/lib/types";

interface RecoveryLayerProps {
  recoveries: MatchEvent[];
  homeTeam: string;
  maxRecoveries?: number;
}

interface TooltipState {
  x: number;
  y: number;
  ev: MatchEvent;
}

export function RecoveryLayer({ recoveries, homeTeam, maxRecoveries = 500 }: RecoveryLayerProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const display = recoveries.slice(0, maxRecoveries);

  return (
    <g>
      {display.map((ev) => {
        if (!ev.location) return null;
        const [x, y] = ev.location;
        const isHome = ev.team === homeTeam;

        return (
          <g key={ev.id}>
            <circle
              cx={x}
              cy={y}
              r={1.4}
              fill={isHome ? "rgba(167, 139, 250, 0.5)" : "rgba(251, 146, 60, 0.5)"}
              stroke={isHome ? "rgba(167, 139, 250, 0.9)" : "rgba(251, 146, 60, 0.9)"}
              strokeWidth={0.25}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setTooltip({ x, y, ev })}
              onMouseLeave={() => setTooltip(null)}
              data-testid={`recovery-${ev.id}`}
            />
          </g>
        );
      })}

      {tooltip && (
        <foreignObject
          x={tooltip.x + 2}
          y={Math.max(0, tooltip.y - 10)}
          width="38"
          height="22"
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <div
            style={{
              background: "rgba(10,10,20,0.95)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "4px",
              padding: "3px 5px",
              fontSize: "8px",
              color: "white",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ fontWeight: 600, color: "#a78bfa" }}>Recovery</div>
            <div style={{ color: "#94a3b8" }}>{tooltip.ev.player}</div>
            <div>{tooltip.ev.minute}&apos;</div>
          </div>
        </foreignObject>
      )}
    </g>
  );
}
