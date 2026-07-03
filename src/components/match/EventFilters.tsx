import type { EventLayer } from "@/store/matchStore";
import type { MatchSummary } from "@/lib/types";

interface EventFiltersProps {
  activeLayer: EventLayer;
  onLayerChange: (layer: EventLayer) => void;
  filterTeam: string | null;
  onTeamChange: (team: string | null) => void;
  filterPlayer: string | null;
  onPlayerChange: (player: string | null) => void;
  filterPeriod: number | null;
  onPeriodChange: (period: number | null) => void;
  summary: MatchSummary;
  players: string[];
  layerCounts: Record<EventLayer, number>;
}

const LAYERS: { id: EventLayer; label: string }[] = [
  { id: "shots", label: "Shots" },
  { id: "passes", label: "Passes" },
  { id: "carries", label: "Carries" },
  { id: "pressures", label: "Pressures" },
  { id: "recoveries", label: "Recoveries" },
];

const btnBase: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "transparent",
  color: "rgba(255,255,255,0.55)",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "Inter, sans-serif",
  transition: "all 0.15s",
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: "rgba(74, 222, 128, 0.15)",
  border: "1px solid rgba(74, 222, 128, 0.4)",
  color: "#4ade80",
};

const selectStyle: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "rgba(255,255,255,0.75)",
  fontSize: 12,
  fontFamily: "Inter, sans-serif",
  cursor: "pointer",
  outline: "none",
  width: "100%",
  colorScheme: "dark",
};

export function EventFilters({
  activeLayer,
  onLayerChange,
  filterTeam,
  onTeamChange,
  filterPlayer,
  onPlayerChange,
  filterPeriod,
  onPeriodChange,
  summary,
  players,
  layerCounts,
}: EventFiltersProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "16px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      data-testid="event-filters"
    >
      {/* Layer toggle */}
      <div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
          Event Type
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {LAYERS.map((l) => {
            const hasData = layerCounts[l.id] > 0;
            const isActive = activeLayer === l.id;
            const btnDisabled: React.CSSProperties = {
              ...btnBase,
              opacity: 0.35,
              cursor: "not-allowed",
              textDecoration: "line-through",
            };
            return (
              <button
                key={l.id}
                onClick={() => hasData && onLayerChange(l.id)}
                style={isActive ? btnActive : hasData ? btnBase : btnDisabled}
                title={hasData ? undefined : "Not available for this data source"}
                data-testid={`filter-layer-${l.id}`}
              >
                {l.label}
              </button>
            );
          })}
        </div>
        {layerCounts.passes === 0 && (
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 8, lineHeight: 1.4 }}>
            Pass / carry / pressure data is only available for StatsBomb matches.
          </p>
        )}
      </div>

      {/* Team filter */}
      <div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
          Team
        </div>
        <select
          value={filterTeam ?? ""}
          onChange={(e) => onTeamChange(e.target.value || null)}
          style={selectStyle}
          data-testid="filter-team"
        >
          <option value="">Both Teams</option>
          <option value={summary.homeTeam}>{summary.homeTeam}</option>
          <option value={summary.awayTeam}>{summary.awayTeam}</option>
        </select>
      </div>

      {/* Player filter */}
      <div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
          Player
        </div>
        <select
          value={filterPlayer ?? ""}
          onChange={(e) => onPlayerChange(e.target.value || null)}
          style={selectStyle}
          data-testid="filter-player"
        >
          <option value="">All Players</option>
          {players.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Period filter */}
      <div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
          Period
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[null, 1, 2].map((p) => (
            <button
              key={String(p)}
              onClick={() => onPeriodChange(p)}
              style={filterPeriod === p ? { ...btnActive, flex: 1, padding: "5px 4px" } : { ...btnBase, flex: 1, padding: "5px 4px" }}
              data-testid={`filter-period-${p ?? "all"}`}
            >
              {p === null ? "All" : p === 1 ? "1st" : "2nd"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
