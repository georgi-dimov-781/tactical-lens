import { useMemo, useState } from "react";
import type { XgPoint } from "@/lib/types";

interface XgTimelineProps {
  data: XgPoint[];
  homeTeam: string;
  awayTeam: string;
  goals?: Array<{ minute: number; team: string; scorer: string }>;
  /** @deprecated — chart is now fully responsive */
  width?: number;
  height?: number;
}

const HOME_COLOR = "#4ade80";
const AWAY_COLOR = "#60a5fa";
const GOAL_COLOR = "#f59e0b";

const VW = 760; // virtual width (viewBox units)

export function XgTimeline({
  data,
  homeTeam,
  awayTeam,
  goals = [],
  height = 200,
}: XgTimelineProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: XgPoint;
  } | null>(null);

  const VH = height;
  const PAD = { top: 16, right: 24, bottom: 32, left: 52 };
  const chartW = VW - PAD.left - PAD.right;
  const chartH = VH - PAD.top - PAD.bottom;

  const { homeLine, awayLine, maxXg, ticks } = useMemo(() => {
    const homePoints: XgPoint[] = [];
    const awayPoints: XgPoint[] = [];

    for (const pt of data) {
      if (pt.team === homeTeam) homePoints.push(pt);
      else if (pt.team === awayTeam) awayPoints.push(pt);
    }

    // Ensure lines start at 0 and extend to 90
    const homeWithStart = [
      { minute: 0, team: homeTeam, cumulativeXg: 0, shotXg: 0, player: "", outcome: "" },
      ...homePoints,
      { minute: 90, team: homeTeam, cumulativeXg: homePoints.at(-1)?.cumulativeXg ?? 0, shotXg: 0, player: "", outcome: "" },
    ];
    const awayWithStart = [
      { minute: 0, team: awayTeam, cumulativeXg: 0, shotXg: 0, player: "", outcome: "" },
      ...awayPoints,
      { minute: 90, team: awayTeam, cumulativeXg: awayPoints.at(-1)?.cumulativeXg ?? 0, shotXg: 0, player: "", outcome: "" },
    ];

    const allXg = [...homeWithStart, ...awayWithStart].map((p) => p.cumulativeXg);
    const max = Math.max(...allXg, 0.5);
    const niceMax = Math.ceil(max * 2) / 2;

    const tickers: number[] = [];
    for (let v = 0; v <= niceMax; v += 0.5) tickers.push(v);

    return { homeLine: homeWithStart, awayLine: awayWithStart, maxXg: niceMax, ticks: tickers };
  }, [data, homeTeam, awayTeam]);

  function xScale(minute: number) {
    return PAD.left + (minute / 90) * chartW;
  }

  function yScale(xg: number) {
    return PAD.top + chartH - (xg / maxXg) * chartH;
  }

  function buildPath(points: XgPoint[]) {
    if (!points.length) return "";
    const cmds: string[] = [];
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const x = xScale(pt.minute);
      const y = yScale(pt.cumulativeXg);
      if (i === 0) cmds.push(`M ${x} ${y}`);
      else {
        cmds.push(`H ${x}`);
        cmds.push(`V ${y}`);
      }
    }
    return cmds.join(" ");
  }

  function buildArea(points: XgPoint[]) {
    if (!points.length) return "";
    return buildPath(points) + ` V ${yScale(0)} H ${xScale(points[0].minute)} Z`;
  }

  const minuteTicks = [0, 15, 30, 45, 60, 75, 90];

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        height={VH}
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="home-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={HOME_COLOR} stopOpacity="0.3" />
            <stop offset="100%" stopColor={HOME_COLOR} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="away-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={AWAY_COLOR} stopOpacity="0.3" />
            <stop offset="100%" stopColor={AWAY_COLOR} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left} y1={yScale(v)}
              x2={PAD.left + chartW} y2={yScale(v)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6} y={yScale(v) + 4}
              textAnchor="end"
              fill="rgba(255,255,255,0.4)"
              fontSize={9}
              fontFamily="Inter, sans-serif"
            >
              {v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Halftime line */}
        <line
          x1={xScale(45)} y1={PAD.top}
          x2={xScale(45)} y2={PAD.top + chartH}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {/* Area fills */}
        <path d={buildArea(homeLine)} fill="url(#home-gradient)" />
        <path d={buildArea(awayLine)} fill="url(#away-gradient)" />

        {/* Lines */}
        <path d={buildPath(homeLine)} stroke={HOME_COLOR} strokeWidth={2} fill="none" strokeLinejoin="round" />
        <path d={buildPath(awayLine)} stroke={AWAY_COLOR} strokeWidth={2} fill="none" strokeLinejoin="round" />

        {/* Goal markers */}
        {goals.map((goal, i) => {
          const gx = xScale(goal.minute);
          return (
            <g key={i}>
              <line
                x1={gx} y1={PAD.top}
                x2={gx} y2={PAD.top + chartH}
                stroke={GOAL_COLOR}
                strokeWidth={1.5}
                strokeDasharray="2 2"
                opacity={0.8}
              />
              <circle cx={gx} cy={PAD.top + 4} r={3} fill={GOAL_COLOR} opacity={0.9} />
            </g>
          );
        })}

        {/* Shot dots */}
        {[...homeLine, ...awayLine]
          .filter((p) => p.shotXg > 0)
          .map((pt, i) => {
            const isHome = pt.team === homeTeam;
            return (
              <circle
                key={i}
                cx={xScale(pt.minute)}
                cy={yScale(pt.cumulativeXg)}
                r={Math.max(2, Math.sqrt(pt.shotXg) * 4)}
                fill={isHome ? HOME_COLOR : AWAY_COLOR}
                opacity={0.8}
                style={{ cursor: "pointer" }}
                onMouseEnter={() =>
                  setTooltip({ x: xScale(pt.minute), y: yScale(pt.cumulativeXg), point: pt })
                }
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}

        {/* X axis */}
        <line
          x1={PAD.left} y1={PAD.top + chartH}
          x2={PAD.left + chartW} y2={PAD.top + chartH}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
        />
        {minuteTicks.map((m) => (
          <g key={m}>
            <line
              x1={xScale(m)} y1={PAD.top + chartH}
              x2={xScale(m)} y2={PAD.top + chartH + 4}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
            />
            <text
              x={xScale(m)} y={PAD.top + chartH + 14}
              textAnchor="middle"
              fill="rgba(255,255,255,0.4)"
              fontSize={9}
              fontFamily="Inter, sans-serif"
            >
              {m === 45 ? "HT" : m === 0 ? "" : `${m}'`}
            </text>
          </g>
        ))}

        {/* Y axis label */}
        <text
          x={14} y={PAD.top + chartH / 2}
          textAnchor="middle"
          fill="rgba(255,255,255,0.35)"
          fontSize={8}
          fontFamily="Inter, sans-serif"
          transform={`rotate(-90, 14, ${PAD.top + chartH / 2})`}
        >
          Cumulative xG
        </text>

        {/* Legend (inside SVG so it scales with the chart) */}
        <g transform={`translate(${VW - PAD.right - 180}, ${PAD.top})`}>
          <rect width="6" height="2" fill={HOME_COLOR} rx="1" y="3" />
          <text x={10} y={8} fill="rgba(255,255,255,0.6)" fontSize={10} fontFamily="Inter, sans-serif">{homeTeam}</text>
          <rect width="6" height="2" fill={AWAY_COLOR} rx="1" y="18" />
          <text x={10} y={23} fill="rgba(255,255,255,0.6)" fontSize={10} fontFamily="Inter, sans-serif">{awayTeam}</text>
        </g>

        {/* Tooltip */}
        {tooltip && (
          <g>
            <line
              x1={tooltip.x} y1={PAD.top}
              x2={tooltip.x} y2={PAD.top + chartH}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <foreignObject
              x={tooltip.x + 6}
              y={tooltip.y - 10}
              width="140"
              height="80"
              style={{ overflow: "visible" }}
            >
              <div
                style={{
                  background: "rgba(10,10,20,0.96)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "6px",
                  padding: "6px 8px",
                  fontSize: "10px",
                  color: "white",
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{tooltip.point.minute}'</div>
                <div style={{ color: "#94a3b8", fontSize: 9, marginBottom: 2 }}>{tooltip.point.player}</div>
                <div style={{ color: "#f59e0b" }}>xG: {tooltip.point.shotXg.toFixed(3)}</div>
                <div style={{ color: "#94a3b8", fontSize: 9 }}>Total: {tooltip.point.cumulativeXg.toFixed(2)}</div>
                <div style={{ color: tooltip.point.outcome === "Goal" ? "#f59e0b" : "#94a3b8", fontSize: 9, fontWeight: 500 }}>
                  {tooltip.point.outcome}
                </div>
              </div>
            </foreignObject>
          </g>
        )}
      </svg>
    </div>
  );
}
