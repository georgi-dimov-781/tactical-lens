import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMatchStore } from "@/store/matchStore";
import type { EventLayer } from "@/store/matchStore";
import {
  loadMatchSummary,
  loadShots,
  loadPasses,
  loadCarries,
  loadPressures,
  loadRecoveries,
  loadXgTimeline,
  loadLineups,
  loadGoalBuildUps,
  loadKeyMoments,
} from "@/lib/data/loadMatch";
import type { MatchSummary } from "@/lib/types";
import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchStats } from "@/components/match/MatchStats";
import { Lineups } from "@/components/match/Lineups";
import { EventFilters } from "@/components/match/EventFilters";
import { GoalBuildUp } from "@/components/match/GoalBuildUp";
import { FootballPitch } from "@/components/pitch/FootballPitch";
import { ShotLayer } from "@/components/pitch/ShotLayer";
import { PassLayer } from "@/components/pitch/PassLayer";
import { CarryLayer } from "@/components/pitch/CarryLayer";
import { PressureLayer } from "@/components/pitch/PressureLayer";
import { RecoveryLayer } from "@/components/pitch/RecoveryLayer";
import { XgTimeline } from "@/components/charts/XgTimeline";
import { KeyMomentsTimeline, type KeyMoments } from "@/components/match/KeyMomentsTimeline";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase",
          letterSpacing: "0.09em",
          marginBottom: 14,
          fontWeight: 500,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

// Parse URL search params into filter state
function parseSearchParams(search: string): {
  view: EventLayer;
  team: string | null;
  player: string | null;
  period: number | null;
} {
  const params = new URLSearchParams(search);
  const rawView = params.get("view");
  const validLayers: EventLayer[] = ["shots", "passes", "carries", "pressures", "recoveries"];
  const view = (validLayers.includes(rawView as EventLayer) ? rawView : "shots") as EventLayer;
  const team = params.get("team") || null;
  const player = params.get("player") || null;
  const rawPeriod = params.get("period");
  const period = rawPeriod === "1" ? 1 : rawPeriod === "2" ? 2 : null;
  return { view, team, player, period };
}

// Build URL search string from filter state
function buildSearchParams(
  view: EventLayer,
  team: string | null,
  player: string | null,
  period: number | null
): string {
  const params = new URLSearchParams();
  if (view && view !== "shots") params.set("view", view);
  if (team) params.set("team", team);
  if (player) params.set("player", player);
  if (period) params.set("period", String(period));
  const str = params.toString();
  return str ? `?${str}` : "";
}

const LAYER_LEGEND: Record<EventLayer, React.ReactNode> = {
  shots: (
    <>
      <span style={{ color: "#f59e0b" }}>◉ Goal</span>
      <span style={{ color: "#4ade80" }}>○ Saved</span>
      <span style={{ color: "#60a5fa" }}>○ Blocked</span>
      <span style={{ color: "#94a3b8" }}>○ Off T</span>
      <span>Size = xG</span>
    </>
  ),
  passes: (
    <>
      <span style={{ color: "rgba(255,255,255,0.5)" }}>— Complete</span>
      <span style={{ color: "rgba(148,163,184,0.5)" }}>‐ ‐ Incomplete</span>
      <span style={{ color: "#f59e0b" }}>— Key Pass</span>
    </>
  ),
  carries: (
    <>
      <span style={{ color: "#4ade80" }}>— Home carry</span>
      <span style={{ color: "#60a5fa" }}>— Away carry</span>
    </>
  ),
  pressures: (
    <>
      <span style={{ color: "#f87171" }}>● Home pressure</span>
      <span style={{ color: "#fb923c" }}>● Away pressure</span>
    </>
  ),
  recoveries: (
    <>
      <span style={{ color: "#a78bfa" }}>● Home recovery</span>
      <span style={{ color: "#fb923c" }}>● Away recovery</span>
    </>
  ),
};

export default function MatchPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const [location, setLocation] = useLocation();

  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyMoments, setKeyMoments] = useState<KeyMoments | null>(null);

  const store = useMatchStore();

  // Parse URL state on mount and when URL changes
  const searchString = typeof window !== "undefined" ? window.location.search : "";
  const urlState = useMemo(() => parseSearchParams(searchString), [searchString]);

  // Sync URL → store on first load / navigation
  useEffect(() => {
    store.setActiveLayer(urlState.view);
    store.setFilterTeam(urlState.team);
    store.setFilterPlayer(urlState.player);
    store.setFilterPeriod(urlState.period);
  }, [matchId]);

  // Sync store → URL whenever filters change
  function updateFilter(
    view: EventLayer,
    team: string | null,
    player: string | null,
    period: number | null
  ) {
    const qs = buildSearchParams(view, team, player, period);
    window.history.replaceState(null, "", `/match/${matchId}${qs}`);
  }

  function handleLayerChange(layer: EventLayer) {
    store.setActiveLayer(layer);
    updateFilter(layer, store.filterTeam, store.filterPlayer, store.filterPeriod);
  }

  function handleTeamChange(team: string | null) {
    store.setFilterTeam(team);
    store.setFilterPlayer(null);
    updateFilter(store.activeLayer, team, null, store.filterPeriod);
  }

  function handlePlayerChange(player: string | null) {
    store.setFilterPlayer(player);
    updateFilter(store.activeLayer, store.filterTeam, player, store.filterPeriod);
  }

  function handlePeriodChange(period: number | null) {
    store.setFilterPeriod(period);
    updateFilter(store.activeLayer, store.filterTeam, store.filterPlayer, period);
  }

  useEffect(() => {
    if (!matchId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      loadMatchSummary(matchId),
      loadShots(matchId),
      loadPasses(matchId),
      loadCarries(matchId).catch(() => []),
      loadPressures(matchId).catch(() => []),
      loadRecoveries(matchId).catch(() => []),
      loadXgTimeline(matchId),
      loadLineups(matchId),
      loadGoalBuildUps(matchId),
      loadKeyMoments(matchId).catch(() => null),
    ])
      .then(([sum, shots, passes, carries, pressures, recoveries, xg, lineups, buildUps, km]) => {
        setSummary(sum);
        store.setShots(shots);
        store.setPasses(passes);
        store.setCarries(carries);
        store.setPressures(pressures);
        store.setRecoveries(recoveries);
        store.setXgTimeline(xg);
        store.setLineups(lineups);
        store.setBuildUps(buildUps);
        setKeyMoments(km);
        // Apply URL params as initial filter state
        const parsed = parseSearchParams(window.location.search);
        store.setActiveLayer(parsed.view);
        store.setFilterTeam(parsed.team);
        store.setFilterPlayer(parsed.player);
        store.setFilterPeriod(parsed.period);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [matchId]);

  // Compute filtered events for pitch
  const filteredShots = useMemo(() => {
    let s = store.shots;
    if (store.filterTeam) s = s.filter((e) => e.team === store.filterTeam);
    if (store.filterPlayer) s = s.filter((e) => e.player === store.filterPlayer);
    if (store.filterPeriod) s = s.filter((e) => e.period === store.filterPeriod);
    return s;
  }, [store.shots, store.filterTeam, store.filterPlayer, store.filterPeriod]);

  const filteredPasses = useMemo(() => {
    let p = store.passes;
    if (store.filterTeam) p = p.filter((e) => e.team === store.filterTeam);
    if (store.filterPlayer) p = p.filter((e) => e.player === store.filterPlayer);
    if (store.filterPeriod) p = p.filter((e) => e.period === store.filterPeriod);
    return p;
  }, [store.passes, store.filterTeam, store.filterPlayer, store.filterPeriod]);

  const filteredCarries = useMemo(() => {
    let c = store.carries;
    if (store.filterTeam) c = c.filter((e) => e.team === store.filterTeam);
    if (store.filterPlayer) c = c.filter((e) => e.player === store.filterPlayer);
    if (store.filterPeriod) c = c.filter((e) => e.period === store.filterPeriod);
    return c;
  }, [store.carries, store.filterTeam, store.filterPlayer, store.filterPeriod]);

  const filteredPressures = useMemo(() => {
    let p = store.pressures;
    if (store.filterTeam) p = p.filter((e) => e.team === store.filterTeam);
    if (store.filterPlayer) p = p.filter((e) => e.player === store.filterPlayer);
    if (store.filterPeriod) p = p.filter((e) => e.period === store.filterPeriod);
    return p;
  }, [store.pressures, store.filterTeam, store.filterPlayer, store.filterPeriod]);

  const filteredRecoveries = useMemo(() => {
    let r = store.recoveries;
    if (store.filterTeam) r = r.filter((e) => e.team === store.filterTeam);
    if (store.filterPlayer) r = r.filter((e) => e.player === store.filterPlayer);
    if (store.filterPeriod) r = r.filter((e) => e.period === store.filterPeriod);
    return r;
  }, [store.recoveries, store.filterTeam, store.filterPlayer, store.filterPeriod]);

  // All players across all event types (filtered by team if selected)
  const allPlayers = useMemo(() => {
    const players = new Set<string>();
    const allEvents = [
      ...store.shots,
      ...store.passes,
      ...store.carries,
      ...store.pressures,
      ...store.recoveries,
    ];
    allEvents.forEach((e) => {
      if (e.player && (!store.filterTeam || e.team === store.filterTeam)) {
        players.add(e.player);
      }
    });
    return [...players].sort();
  }, [store.shots, store.passes, store.carries, store.pressures, store.recoveries, store.filterTeam]);

  // Goal events for xG timeline markers
  const goals = useMemo(
    () =>
      store.shots
        .filter((s) => s.result === "Goal")
        .map((s) => ({
          minute: s.minute,
          team: s.team,
          scorer: s.player ?? "Unknown",
        })),
    [store.shots]
  );

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "2px solid rgba(74,222,128,0.2)",
            borderTop: "2px solid #4ade80",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
          Loading match data...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ color: "#f87171", fontSize: 15 }}>
          {error ?? "Match not found"}
        </div>
        <button
          onClick={() => setLocation("/")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
          }}
        >
          ← Back to matches
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        fontFamily: "Inter, sans-serif",
        color: "white",
      }}
    >
      {/* Nav */}
      <nav
        className="rsp-nav"
        style={{
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          onClick={() => setLocation("/")}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.45)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
          data-testid="back-button"
        >
          ← Matches
        </button>
        <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
          {summary.competition}
        </span>
        <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
        <span className="rsp-hide-mobile" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
          Tactical Lens
        </span>
      </nav>

      {/* Match header */}
      <MatchHeader summary={summary} />

      {/* Main content */}
      <div
        className="rsp-content"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "28px 32px 60px",
        }}
      >
        {/* Stats + Lineups row */}
        <div className="rsp-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
          <MatchStats summary={summary} />

          <Lineups lineups={store.lineups} homeTeam={summary.homeTeam} awayTeam={summary.awayTeam} />
        </div>

        {/* Pitch Map */}
        <Section title="Interactive Pitch Map">
          <div
            className="rsp-grid-pitch"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 200px",
              gap: 16,
              alignItems: "start",
            }}
          >
            {/* Pitch */}
            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.07)",
                background: "#111",
              }}
              data-testid="pitch-map"
            >
              <FootballPitch height={440}>
                {store.activeLayer === "shots" && (
                  <ShotLayer shots={filteredShots} homeTeam={summary.homeTeam} />
                )}
                {store.activeLayer === "passes" && (
                  <PassLayer passes={filteredPasses} homeTeam={summary.homeTeam} />
                )}
                {store.activeLayer === "carries" && (
                  <CarryLayer carries={filteredCarries} homeTeam={summary.homeTeam} />
                )}
                {store.activeLayer === "pressures" && (
                  <PressureLayer pressures={filteredPressures} homeTeam={summary.homeTeam} />
                )}
                {store.activeLayer === "recoveries" && (
                  <RecoveryLayer recoveries={filteredRecoveries} homeTeam={summary.homeTeam} />
                )}
              </FootballPitch>

              {/* Pitch legend — adapts to active layer */}
              <div
                style={{
                  padding: "8px 12px",
                  display: "flex",
                  gap: 14,
                  fontSize: 10,
                  background: "rgba(0,0,0,0.3)",
                  color: "rgba(255,255,255,0.35)",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "#4ade80" }}>● {summary.homeTeam}</span>
                <span style={{ color: "#60a5fa" }}>● {summary.awayTeam}</span>
                <span style={{ opacity: 0.4, margin: "0 2px" }}>|</span>
                {LAYER_LEGEND[store.activeLayer]}
              </div>
            </div>

            {/* Filters — wired through URL-syncing handlers */}
            <EventFilters
              activeLayer={store.activeLayer}
              onLayerChange={handleLayerChange}
              filterTeam={store.filterTeam}
              onTeamChange={handleTeamChange}
              filterPlayer={store.filterPlayer}
              onPlayerChange={handlePlayerChange}
              filterPeriod={store.filterPeriod}
              onPeriodChange={handlePeriodChange}
              summary={summary}
              players={allPlayers}
              layerCounts={{
                shots: store.shots.length,
                passes: store.passes.length,
                carries: store.carries.length,
                pressures: store.pressures.length,
                recoveries: store.recoveries.length,
              }}
            />
          </div>
        </Section>

        {/* Key Moments Timeline */}
        {keyMoments && (
          <Section title="Key Moments">
            <div
              style={{
                borderRadius: 12,
                padding: "20px 24px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <KeyMomentsTimeline
                moments={keyMoments}
                homeTeam={summary.homeTeam}
                awayTeam={summary.awayTeam}
              />
            </div>
          </Section>
        )}

        {/* xG Timeline */}
        <Section title="xG Timeline">
          <div
            style={{
              borderRadius: 12,
              padding: "20px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              overflowX: "auto",
            }}
            data-testid="xg-timeline"
          >
            <XgTimeline
              data={store.xgTimeline}
              homeTeam={summary.homeTeam}
              awayTeam={summary.awayTeam}
              goals={goals}
              height={220}
            />
          </div>
        </Section>

        {/* Goal Build-up */}
        <Section title="Goal Build-up Stories">
          <div
            style={{
              borderRadius: 12,
              padding: "20px 24px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <GoalBuildUp
              buildUps={store.buildUps}
              homeTeam={summary.homeTeam}
              awayTeam={summary.awayTeam}
            />
          </div>
        </Section>
      </div>

      {/* Attribution */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
          {summary.source === "understat" ? (
            <>Data: <a href="https://understat.com" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(74,222,128,0.4)", textDecoration: "none" }}>Understat</a></>
          ) : (
            <>Data: <a href="https://github.com/statsbomb/open-data" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(74,222,128,0.4)", textDecoration: "none" }}>StatsBomb Open Data</a></>
          )}
        </span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
          Tactical Lens
        </span>
      </footer>
    </div>
  );
}
