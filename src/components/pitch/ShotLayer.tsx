import { useState } from "react";
import { createPortal } from "react-dom";
import type { ShotEvent } from "@/lib/types";

interface ShotLayerProps {
  shots: ShotEvent[];
  homeTeam: string;
}

const RESULT_COLORS: Record<string, string> = {
  Goal: "#f59e0b",
  Saved: "#4ade80",
  Blocked: "#60a5fa",
  "Off T": "#94a3b8",
  Wayward: "#94a3b8",
  Post: "#f97316",
};

function xgToRadius(xg: number): number {
  return 1.5 + Math.sqrt(xg) * 3;
}

interface TooltipState {
  screenX: number;
  screenY: number;
  shot: ShotEvent;
}

export function ShotLayer({ shots, homeTeam }: ShotLayerProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  return (
    <g>
      {shots.map((shot) => {
        if (!shot.location) return null;
        const [sx, sy] = shot.location;
        const r = xgToRadius(shot.xg || 0);
        const color = RESULT_COLORS[shot.result] ?? "#94a3b8";
        const isGoal = shot.result === "Goal";
        const isHome = shot.team === homeTeam;

        return (
          <g key={shot.id}>
            {isGoal && (
              <circle
                cx={sx}
                cy={sy}
                r={r + 1.5}
                fill={color}
                opacity={0.15}
                style={{ animation: "pulse 2s infinite" }}
              />
            )}
            <circle
              cx={sx}
              cy={sy}
              r={r}
              fill={color}
              fillOpacity={isGoal ? 0.9 : 0.65}
              stroke={isHome ? "rgba(74,222,128,0.6)" : "rgba(96,165,250,0.6)"}
              strokeWidth={isGoal ? 0.5 : 0.3}
              style={{ cursor: "pointer", filter: isGoal ? "url(#shot-glow)" : undefined }}
              onMouseEnter={(e) => {
                const rect = (e.target as SVGElement).getBoundingClientRect();
                setTooltip({
                  screenX: rect.left + rect.width / 2,
                  screenY: rect.top,
                  shot,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
              data-testid={`shot-${shot.id}`}
            />
          </g>
        );
      })}

      {tooltip &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: tooltip.screenX,
              top: tooltip.screenY - 8,
              transform: "translate(-50%, -100%)",
              background: "rgba(10,10,20,0.95)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 6,
              padding: "6px 9px",
              fontSize: 12,
              color: "white",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 9999,
              fontFamily: "Inter, sans-serif",
              lineHeight: 1.5,
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ fontWeight: 700, color: RESULT_COLORS[tooltip.shot.result] ?? "#fff", marginBottom: 2 }}>
              {tooltip.shot.result}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 11 }}>{tooltip.shot.player}</div>
            <div style={{ fontSize: 11 }}>{tooltip.shot.minute}&apos;</div>
            <div style={{ color: "#f59e0b", fontWeight: 600 }}>xG {(tooltip.shot.xg || 0).toFixed(2)}</div>
          </div>,
          document.body
        )}
    </g>
  );
}
