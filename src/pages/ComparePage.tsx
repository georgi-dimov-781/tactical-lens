import { useState } from "react";
import { useLocation } from "wouter";
import { PlayerSearch } from "@/components/search/PlayerSearch";
import { ShotMap } from "@/components/pitch/ShotMap";
import { usePlayerData, type PlayerStats } from "@/lib/hooks/usePlayerData";
import type { PlayerIndexEntry } from "@/lib/data/loadMatch";

const COLOR_A = "#4ade80";  // green
const COLOR_B = "#a78bfa";  // purple
const GOAL_COLOR = "#f59e0b";

// ─── Comparison bar row ────────────────────────────────────────────────────────
function CompareRow({
  label,
  valA,
  valB,
  fmtA,
  fmtB,
  higherIsBetter = true,
}: {
  label: string;
  valA: number;
  valB: number;
  fmtA?: string;
  fmtB?: string;
  higherIsBetter?: boolean;
}) {
  const total = valA + valB || 1;
  const shareA = valA / total;
  const shareB = valB / total;
  const aWins = higherIsBetter ? valA > valB : valA < valB;
  const bWins = higherIsBetter ? valB > valA : valB < valA;

  return (
    <div className="rsp-compare-row" style={{ display: "grid", gridTemplateColumns: "1fr 160px 1fr", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      {/* A value */}
      <div style={{ textAlign: "right" }}>
        <span className="rsp-val" style={{ fontSize: 20, fontWeight: 800, color: aWins ? COLOR_A : "rgba(255,255,255,0.6)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
          {fmtA ?? valA}
        </span>
      </div>

      {/* Bar + label */}
      <div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 1 }}>
          <div style={{ flex: shareA, background: aWins ? COLOR_A : "rgba(74,222,128,0.3)", borderRadius: "3px 0 0 3px", transition: "flex 0.5s ease" }} />
          <div style={{ flex: shareB, background: bWins ? COLOR_B : "rgba(167,139,250,0.3)", borderRadius: "0 3px 3px 0", transition: "flex 0.5s ease" }} />
        </div>
      </div>

      {/* B value */}
      <div>
        <span className="rsp-val" style={{ fontSize: 20, fontWeight: 800, color: bWins ? COLOR_B : "rgba(255,255,255,0.6)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
          {fmtB ?? valB}
        </span>
      </div>
    </div>
  );
}

// ─── xG race chart ────────────────────────────────────────────────────────────
function XgRaceChart({
  playerA,
  playerB,
  dataA,
  dataB,
}: {
  playerA: PlayerIndexEntry;
  playerB: PlayerIndexEntry;
  dataA: ReturnType<typeof usePlayerData>["matchData"];
  dataB: ReturnType<typeof usePlayerData>["matchData"];
}) {
  const VW = 600, VH = 180;
  const PAD = { top: 16, right: 20, bottom: 36, left: 48 };
  const W = VW - PAD.left - PAD.right;
  const H = VH - PAD.top - PAD.bottom;

  // Build cumulative series sorted by date
  type Point = { date: string; cumXg: number };

  function buildSeries(data: typeof dataA): Point[] {
    const sorted = [...data].sort((a, b) => a.summary.date.localeCompare(b.summary.date));
    let cum = 0;
    return sorted.map((m) => {
      cum += m.shots.reduce((acc, s) => acc + (s.xg || 0), 0);
      return { date: m.summary.date, cumXg: cum };
    });
  }

  const seriesA = buildSeries(dataA);
  const seriesB = buildSeries(dataB);

  if (!seriesA.length && !seriesB.length) return null;

  const allDates = [...new Set([...seriesA, ...seriesB].map((p) => p.date))].sort();
  const maxXg = Math.max(...seriesA.map((p) => p.cumXg), ...seriesB.map((p) => p.cumXg), 1);
  const niceMax = Math.ceil(maxXg);

  function xScale(dateStr: string) {
    const i = allDates.indexOf(dateStr);
    return PAD.left + (i / Math.max(allDates.length - 1, 1)) * W;
  }
  function yScale(v: number) {
    return PAD.top + H - (v / niceMax) * H;
  }

  function buildPath(series: Point[]) {
    if (!series.length) return "";
    return series
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.date)} ${yScale(p.cumXg)}`)
      .join(" ");
  }

  const yTicks = Array.from({ length: niceMax + 1 }, (_, i) => i).filter((v) => v <= niceMax);

  return (
    <div>
      <h2 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
        Cumulative xG Race
      </h2>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: "block" }}>
        {/* Grid */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} y1={yScale(v)} x2={PAD.left + W} y2={yScale(v)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={9} fontFamily="Inter,sans-serif">{v}</text>
          </g>
        ))}
        {/* X axis labels — show a few dates */}
        {allDates.filter((_, i) => i === 0 || i === allDates.length - 1 || i % Math.ceil(allDates.length / 4) === 0).map((d) => (
          <text key={d} x={xScale(d)} y={PAD.top + H + 16} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={8} fontFamily="Inter,sans-serif">
            {d.slice(5)}
          </text>
        ))}
        {/* Lines */}
        <path d={buildPath(seriesA)} stroke={COLOR_A} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <path d={buildPath(seriesB)} stroke={COLOR_B} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {/* End labels */}
        {seriesA.length > 0 && (
          <text x={xScale(seriesA.at(-1)!.date) + 4} y={yScale(seriesA.at(-1)!.cumXg) + 4} fill={COLOR_A} fontSize={9} fontFamily="Inter,sans-serif" fontWeight={600}>
            {seriesA.at(-1)!.cumXg.toFixed(1)}
          </text>
        )}
        {seriesB.length > 0 && (
          <text x={xScale(seriesB.at(-1)!.date) + 4} y={yScale(seriesB.at(-1)!.cumXg) + 4} fill={COLOR_B} fontSize={9} fontFamily="Inter,sans-serif" fontWeight={600}>
            {seriesB.at(-1)!.cumXg.toFixed(1)}
          </text>
        )}
        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + H} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top + H} x2={PAD.left + W} y2={PAD.top + H} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
      </svg>
      <div style={{ display: "flex", gap: 20, marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 18, height: 2, background: COLOR_A, borderRadius: 1 }} />
          {playerA.name.split(" ")[0]}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 18, height: 2, background: COLOR_B, borderRadius: 1 }} />
          {playerB.name.split(" ")[0]}
        </div>
      </div>
    </div>
  );
}

// ─── Player picker column ──────────────────────────────────────────────────────
function PlayerPicker({
  label,
  color,
  selected,
  onSelect,
  loading,
  loadedCount,
  total,
  stats,
}: {
  label: string;
  color: string;
  selected: PlayerIndexEntry | null;
  onSelect: (p: PlayerIndexEntry | null) => void;
  loading: boolean;
  loadedCount: number;
  total: number;
  stats: PlayerStats;
}) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 600 }}>
        {label}
      </div>
      <PlayerSearch selected={selected} onSelect={onSelect} />
      {selected && (
        <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          {selected.country} · {selected.teams.join(" / ")}
        </div>
      )}
      {loading && selected && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>
          Loading {loadedCount}/{total} matches…
        </div>
      )}
      {!loading && selected && stats.matchCount > 0 && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
          {stats.matchCount} matches loaded
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ComparePage() {
  const [, setLocation] = useLocation();
  const [selectedA, setSelectedA] = useState<PlayerIndexEntry | null>(null);
  const [selectedB, setSelectedB] = useState<PlayerIndexEntry | null>(null);

  const { player: playerA, matchData: dataA, stats: statsA, loading: loadingA, loadedCount: countA, annotatedShots: shotsA } =
    usePlayerData(selectedA?.id ?? null);
  const { player: playerB, matchData: dataB, stats: statsB, loading: loadingB, loadedCount: countB, annotatedShots: shotsB } =
    usePlayerData(selectedB?.id ?? null);

  const bothLoaded = playerA && playerB && dataA.length > 0 && dataB.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "Inter, sans-serif" }}>
      {/* Nav */}
      <header className="rsp-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => setLocation("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0, fontFamily: "Inter,sans-serif" }}>
          ← Matches
        </button>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Player Comparison</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 7px #4ade80" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>Tactical Lens</span>
        </div>
      </header>

      <div className="rsp-content" style={{ maxWidth: 960, margin: "0 auto", padding: "40px 32px 80px" }}>
        {/* Page title */}
        <h1 style={{ fontSize: 36, fontWeight: 800, color: "white", letterSpacing: "-0.03em", marginBottom: 6 }}>
          Head-to-Head
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 36 }}>
          Pick two players to compare their stats, shot maps, and xG progression.
        </p>

        {/* Player pickers */}
        <div className="rsp-compare-pickers" style={{ display: "grid", gridTemplateColumns: "1fr 48px 1fr", gap: 16, alignItems: "start", marginBottom: 40 }}>
          <PlayerPicker
            label="Player A"
            color={COLOR_A}
            selected={selectedA}
            onSelect={setSelectedA}
            loading={loadingA}
            loadedCount={countA}
            total={selectedA?.matchIds.length ?? 0}
            stats={statsA}
          />
          <div className="rsp-vs-divider" style={{ textAlign: "center", paddingTop: 28, fontSize: 18, color: "rgba(255,255,255,0.2)", fontWeight: 700 }}>vs</div>
          <PlayerPicker
            label="Player B"
            color={COLOR_B}
            selected={selectedB}
            onSelect={setSelectedB}
            loading={loadingB}
            loadedCount={countB}
            total={selectedB?.matchIds.length ?? 0}
            stats={statsB}
          />
        </div>

        {/* Empty state */}
        {!selectedA && !selectedB && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
            Search for two players above to begin the comparison.
          </div>
        )}

        {/* Comparison content */}
        {bothLoaded && (
          <>
            {/* Player name banner */}
            <div className="rsp-compare-banner" style={{ display: "grid", gridTemplateColumns: "1fr 48px 1fr", gap: 16, marginBottom: 32, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: COLOR_A, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {playerA!.name}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{playerA!.teams.join(" / ")}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>vs</div>
              </div>
              <div className="rsp-compare-banner-b" style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: COLOR_B, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {playerB!.name}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{playerB!.teams.join(" / ")}</div>
              </div>
            </div>

            {/* Stat comparison */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "8px 24px", marginBottom: 32 }}>
              <CompareRow label="Matches" valA={statsA.matchCount} valB={statsB.matchCount} />
              <CompareRow label="Goals" valA={statsA.goals} valB={statsB.goals}
                fmtA={statsA.goals > 0 ? `⚽ ${statsA.goals}` : "0"}
                fmtB={statsB.goals > 0 ? `⚽ ${statsB.goals}` : "0"} />
              <CompareRow label="Total xG" valA={statsA.totalXg} valB={statsB.totalXg}
                fmtA={statsA.totalXg.toFixed(2)} fmtB={statsB.totalXg.toFixed(2)} />
              <CompareRow label="Shots" valA={statsA.totalShots} valB={statsB.totalShots} />
              <CompareRow label="xG / Shot" valA={statsA.xgPerShot} valB={statsB.xgPerShot}
                fmtA={statsA.xgPerShot.toFixed(3)} fmtB={statsB.xgPerShot.toFixed(3)} />
              <CompareRow label="Conversion %" valA={statsA.conversion} valB={statsB.conversion}
                fmtA={`${statsA.conversion.toFixed(0)}%`} fmtB={`${statsB.conversion.toFixed(0)}%`} />
              <CompareRow label="Passes / Match" valA={statsA.passesPerMatch} valB={statsB.passesPerMatch}
                fmtA={statsA.passesPerMatch.toFixed(0)} fmtB={statsB.passesPerMatch.toFixed(0)} />
            </div>

            {/* Shot maps */}
            <div className="rsp-shot-maps" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
              <ShotMap shots={shotsA} accentColor={COLOR_A} label={playerA!.name.split(" ")[0]} />
              <ShotMap shots={shotsB} accentColor={COLOR_B} label={playerB!.name.split(" ")[0]} />
            </div>

            {/* xG race */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "20px 24px", marginBottom: 32 }}>
              <XgRaceChart playerA={playerA!} playerB={playerB!} dataA={dataA} dataB={dataB} />
            </div>

            {/* Profile links */}
            <div className="rsp-profile-btns" style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                className="rsp-profile-btn"
                onClick={() => setLocation(`/player/${playerA!.id}`)}
                style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${COLOR_A}33`, background: `${COLOR_A}11`, color: COLOR_A, fontSize: 13, cursor: "pointer", fontFamily: "Inter,sans-serif" }}
              >
                {playerA!.name.split(" ")[0]} full profile →
              </button>
              <button
                className="rsp-profile-btn"
                onClick={() => setLocation(`/player/${playerB!.id}`)}
                style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${COLOR_B}33`, background: `${COLOR_B}11`, color: COLOR_B, fontSize: 13, cursor: "pointer", fontFamily: "Inter,sans-serif" }}
              >
                {playerB!.name.split(" ")[0]} full profile →
              </button>
            </div>
          </>
        )}

        {/* One player selected, waiting for second */}
        {(selectedA || selectedB) && !(bothLoaded) && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
            {loadingA || loadingB
              ? "Loading match data…"
              : `Now pick ${!selectedA ? "Player A" : "Player B"} to start comparing.`}
          </div>
        )}
      </div>
    </div>
  );
}
