import { useState } from "react";
import type { MatchEvent } from "@/lib/types";

interface PressureLayerProps {
  pressures: MatchEvent[];
  homeTeam: string;
  maxPressures?: number;
}

interface TooltipState {
  x: number;
  y: number;
  ev: MatchEvent;
}

export function PressureLayer({ pressures, homeTeam, maxPressures = 400 }: PressureLayerProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const display = pressures.slice(0, maxPressures);

  return (
    <g>
      {display.map((ev) => {
        if (!ev.location) return null;
        const [x, y] = ev.location;
        const isHome = ev.team === homeTeam;

        return (
          <circle
            key={ev.id}
            cx={x}
            cy={y}
            r={1.2}
            fill={isHome ? "rgba(248, 113, 113, 0.35)" : "rgba(251, 146, 60, 0.35)"}
            stroke={isHome ? "rgba(248, 113, 113, 0.7)" : "rgba(251, 146, 60, 0.7)"}
            strokeWidth={0.2}
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setTooltip({ x, y, ev })}
            onMouseLeave={() => setTooltip(null)}
            data-testid={`pressure-${ev.id}`}
          />
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
            <div style={{ fontWeight: 600, color: "#f87171" }}>Pressure</div>
            <div style={{ color: "#94a3b8" }}>{tooltip.ev.player}</div>
            <div>{tooltip.ev.minute}&apos;</div>
          </div>
        </foreignObject>
      )}
    </g>
  );
}
