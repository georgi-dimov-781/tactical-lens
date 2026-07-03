import { useState } from "react";
import type { MatchEvent } from "@/lib/types";

interface CarryLayerProps {
  carries: MatchEvent[];
  homeTeam: string;
  maxCarries?: number;
}

interface TooltipState {
  mx: number;
  my: number;
  ev: MatchEvent;
}

export function CarryLayer({ carries, homeTeam, maxCarries = 300 }: CarryLayerProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const display = carries.slice(0, maxCarries);

  return (
    <g>
      {display.map((carry) => {
        if (!carry.location || !carry.endLocation) return null;
        const [x1, y1] = carry.location;
        const [x2, y2] = carry.endLocation;
        const isHome = carry.team === homeTeam;

        const color = isHome
          ? "rgba(74, 222, 128, 0.4)"
          : "rgba(96, 165, 250, 0.4)";

        return (
          <line
            key={carry.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={0.5}
            strokeLinecap="round"
            style={{ cursor: "pointer" }}
            onMouseEnter={() =>
              setTooltip({ mx: (x1 + x2) / 2, my: (y1 + y2) / 2, ev: carry })
            }
            onMouseLeave={() => setTooltip(null)}
            data-testid={`carry-${carry.id}`}
          />
        );
      })}

      {tooltip && (
        <foreignObject
          x={tooltip.mx + 1}
          y={Math.max(0, tooltip.my - 10)}
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
            <div style={{ fontWeight: 600, color: "#60a5fa" }}>Carry</div>
            <div style={{ color: "#94a3b8" }}>{tooltip.ev.player}</div>
            <div>{tooltip.ev.minute}&apos;</div>
          </div>
        </foreignObject>
      )}
    </g>
  );
}
