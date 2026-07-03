import { useState } from "react";
import type { PassEvent } from "@/lib/types";

interface PassLayerProps {
  passes: PassEvent[];
  homeTeam: string;
  maxPasses?: number;
}

interface TooltipInfo {
  pass: PassEvent;
  mx: number;
  my: number;
}

export function PassLayer({ passes, homeTeam, maxPasses = 400 }: PassLayerProps) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const displayPasses = passes.slice(0, maxPasses);

  return (
    <g>
      {displayPasses.map((pass) => {
        if (!pass.location || !pass.endLocation) return null;
        const [x1, y1] = pass.location;
        const [x2, y2] = pass.endLocation;
        const isHome = pass.team === homeTeam;
        const isComplete = !pass.outcome || pass.outcome === "Complete" || pass.outcome === "Incomplete" === false;
        const isKey = pass.isKeyPass;

        const strokeColor = isKey
          ? "#f59e0b"
          : isHome
          ? "rgba(74, 222, 128, 0.55)"
          : "rgba(96, 165, 250, 0.55)";

        const incompleteColor = "rgba(148, 163, 184, 0.25)";
        const incomplete = pass.outcome && pass.outcome !== "Complete" && pass.outcome !== "Pass Offside";

        return (
          <line
            key={pass.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={incomplete ? incompleteColor : strokeColor}
            strokeWidth={isKey ? 0.7 : 0.35}
            strokeDasharray={incomplete ? "1 1" : undefined}
            markerEnd={
              incomplete
                ? "url(#arrow-incomplete)"
                : isHome
                ? "url(#arrow-home)"
                : "url(#arrow-away)"
            }
            opacity={isKey ? 1 : 0.7}
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => {
              const mid = { mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
              setTooltip({ pass, ...mid });
            }}
            onMouseLeave={() => setTooltip(null)}
            data-testid={`pass-${pass.id}`}
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
            <div style={{ fontWeight: 600 }}>{tooltip.pass.player}</div>
            <div style={{ color: "#94a3b8" }}>→ {tooltip.pass.recipient || "?"}</div>
            <div>{tooltip.pass.minute}&apos; {tooltip.pass.outcome && `(${tooltip.pass.outcome})`}</div>
          </div>
        </foreignObject>
      )}
    </g>
  );
}
