interface FootballPitchProps {
  height?: number;
  children?: React.ReactNode;
  className?: string;
  /** @deprecated pass nothing — the pitch now fills its container's width */
  width?: number;
}

/**
 * Reusable SVG football pitch (StatsBomb coordinate system: 120×80).
 * The SVG uses viewBox="0 0 120 80" and fills 100% of its container width.
 * Pass an explicit `height` to lock the vertical dimension; otherwise the
 * pitch maintains a 3:2 aspect ratio via CSS aspect-ratio.
 */
export function FootballPitch({ height, children, className = "" }: FootballPitchProps) {
  const W = 120;
  const H = 80;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height={height ?? undefined}
      className={className}
      style={{
        display: "block",
        ...(height == null ? { aspectRatio: "120/80" } : {}),
      }}
    >
      {/* Pitch surface — dark green with alternating stripe effect */}
      <defs>
        <pattern id="grass-stripes" x="0" y="0" width="10" height="80" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="10" height="80" fill="#1a3d1a" />
          <rect x="0" y="0" width="5" height="80" fill="#1e4520" />
        </pattern>
        <filter id="shot-glow">
          <feGaussianBlur stdDeviation="0.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="arrow-home" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <polygon points="0 0, 4 2, 0 4" fill="rgba(74, 222, 128, 0.8)" />
        </marker>
        <marker id="arrow-away" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <polygon points="0 0, 4 2, 0 4" fill="rgba(96, 165, 250, 0.8)" />
        </marker>
        <marker id="arrow-incomplete" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <polygon points="0 0, 4 2, 0 4" fill="rgba(148, 163, 184, 0.5)" />
        </marker>
      </defs>

      {/* Grass */}
      <rect x="0" y="0" width={W} height={H} fill="url(#grass-stripes)" />

      {/* Pitch outline */}
      <rect x="0" y="0" width={W} height={H} className="pitch-line" strokeWidth="0.4" />

      {/* Halfway line */}
      <line x1="60" y1="0" x2="60" y2={H} className="pitch-line" strokeWidth="0.4" />

      {/* Centre circle */}
      <circle cx="60" cy="40" r="10" className="pitch-line" strokeWidth="0.4" />
      <circle cx="60" cy="40" r="0.5" fill="rgba(255,255,255,0.5)" />

      {/* Left penalty area */}
      <rect x="0" y="18" width="18" height="44" className="pitch-line" strokeWidth="0.4" />
      {/* Left 6-yard box */}
      <rect x="0" y="30" width="6" height="20" className="pitch-line" strokeWidth="0.4" />
      {/* Left goal */}
      <rect x="0" y="36" width="1.5" height="8" fill="rgba(255,255,255,0.15)" className="pitch-line" strokeWidth="0.4" />
      {/* Left penalty spot */}
      <circle cx="12" cy="40" r="0.4" fill="rgba(255,255,255,0.5)" />
      {/* Left penalty arc */}
      <path d="M 18 31.8 A 10 10 0 0 0 18 48.2" className="pitch-line" strokeWidth="0.4" fill="none" />

      {/* Right penalty area */}
      <rect x="102" y="18" width="18" height="44" className="pitch-line" strokeWidth="0.4" />
      {/* Right 6-yard box */}
      <rect x="114" y="30" width="6" height="20" className="pitch-line" strokeWidth="0.4" />
      {/* Right goal */}
      <rect x="118.5" y="36" width="1.5" height="8" fill="rgba(255,255,255,0.15)" className="pitch-line" strokeWidth="0.4" />
      {/* Right penalty spot */}
      <circle cx="108" cy="40" r="0.4" fill="rgba(255,255,255,0.5)" />
      {/* Right penalty arc */}
      <path d="M 102 31.8 A 10 10 0 0 1 102 48.2" className="pitch-line" strokeWidth="0.4" fill="none" />

      {/* Corner arcs */}
      <path d="M 0 2 A 2 2 0 0 1 2 0" className="pitch-line" strokeWidth="0.4" fill="none" />
      <path d="M 118 0 A 2 2 0 0 1 120 2" className="pitch-line" strokeWidth="0.4" fill="none" />
      <path d="M 0 78 A 2 2 0 0 0 2 80" className="pitch-line" strokeWidth="0.4" fill="none" />
      <path d="M 118 80 A 2 2 0 0 0 120 78" className="pitch-line" strokeWidth="0.4" fill="none" />

      {/* Event layers rendered on top */}
      {children}
    </svg>
  );
}
