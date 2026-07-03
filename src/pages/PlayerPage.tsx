import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { usePlayerData } from "@/lib/hooks/usePlayerData";
import { ShotMap } from "@/components/pitch/ShotMap";
import type { ShotEvent, MatchSummary } from "@/lib/types";

const GOAL_COLOR = "#f59e0b";
const HOME_COLOR = "#4ade80";

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "white" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 22px" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ─── Match log row ─────────────────────────────────────────────────────────────
function MatchRow({
  summary, playerTeam, shots, passes, onClick,
}: {
  summary: MatchSummary; playerTeam: string; shots: ShotEvent[]; passes: number; onClick: () => void;
}) {
  const goals = shots.filter((s) => s.outcome === "Goal").length;
  const xg = shots.reduce((acc, s) => acc + (s.xg || 0), 0);
  const isHome = playerTeam === summary.homeTeam;
  const opponent = isHome ? summary.awayTeam : summary.homeTeam;
  const playerScore = isHome ? summary.homeScore : summary.awayScore;
  const oppScore = isHome ? summary.awayScore : summary.homeScore;

  return (
    <tr
      onClick={onClick}
      style={{ cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
    >
      <td style={{ padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>{summary.date}</td>
      <td style={{ padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{summary.competition}</td>
      <td style={{ padding: "10px 12px", fontSize: 13, color: "rgba(255,255,255,0.8)" }}>vs {opponent}</td>
      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: playerScore > oppScore ? HOME_COLOR : playerScore < oppScore ? "#f87171" : "rgba(255,255,255,0.5)" }}>
        {playerScore}–{oppScore}
      </td>
      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: goals > 0 ? 700 : 400, color: goals > 0 ? GOAL_COLOR : "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums", textAlign: "center" }}>
        {goals > 0 ? `⚽ ${goals}` : "—"}
      </td>
      <td style={{ padding: "10px 12px", fontSize: 12, color: shots.length > 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums", textAlign: "center" }}>
        {shots.length > 0 ? `${shots.length} (${xg.toFixed(2)} xG)` : "—"}
      </td>
      <td style={{ padding: "10px 12px", fontSize: 12, color: "rgba(255,255,255,0.45)", fontVariantNumeric: "tabular-nums", textAlign: "center" }}>
        {passes > 0 ? passes : "—"}
      </td>
    </tr>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function PlayerPage({ params }: { params: { playerId: string } }) {
  const [, setLocation] = useLocation();
  const playerId = Number(params.playerId);

  const { player, matchData, stats, loading, loadedCount, annotatedShots } = usePlayerData(playerId);

  if (!player && !loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontSize: 15, fontFamily: "Inter,sans-serif" }}>
        Player not found.
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "Inter, sans-serif" }}>
      {/* Nav */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => setLocation("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0, fontFamily: "Inter,sans-serif" }}>
          ← Matches
        </button>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Player Profile</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {player && (
            <button
              onClick={() => setLocation(`/compare?a=${player.id}`)}
              style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.08)", color: "#a78bfa", fontSize: 12, cursor: "pointer", fontFamily: "Inter,sans-serif" }}
            >
              Compare ↔
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 7px #4ade80" }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>Tactical Lens</span>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 32px 80px" }}>
        {/* Player header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            {player?.country ?? ""}
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 800, color: "white", letterSpacing: "-0.03em", marginBottom: 8 }}>
            {player?.name ?? "Loading…"}
          </h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {player?.teams.map((t) => (
              <span key={t} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 5, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.18)", color: "#4ade80" }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {loading && matchData.length === 0 && (
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginBottom: 24 }}>Loading match data…</div>
        )}
        {loading && matchData.length > 0 && (
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginBottom: 24 }}>
            Loading… {loadedCount} / {player?.matchIds.length ?? "?"} matches
          </div>
        )}

        {matchData.length > 0 && (
          <>
            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 36 }}>
              <StatCard label="Matches" value={stats.matchCount} />
              <StatCard label="Goals" value={stats.goals} color={stats.goals > 0 ? GOAL_COLOR : "white"} />
              <StatCard label="Total xG" value={stats.totalXg.toFixed(2)} color={HOME_COLOR} sub={`avg ${stats.matchCount > 0 ? (stats.totalXg / stats.matchCount).toFixed(2) : "0"} per match`} />
              <StatCard label="Shots" value={stats.totalShots} sub={`${stats.conversion.toFixed(0)}% conversion`} />
              <StatCard label="Passes" value={stats.totalPasses} sub={stats.matchCount > 0 ? `${Math.round(stats.totalPasses / stats.matchCount)} per match` : undefined} />
            </div>

            {/* Shot map + xG bars */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 36 }}>
              <div>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                  Shot Map
                </h2>
                {annotatedShots.length > 0
                  ? <ShotMap shots={annotatedShots} accentColor={HOME_COLOR} label={`${annotatedShots.length} total`} />
                  : <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>No shots recorded</div>
                }
              </div>

              <div>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                  xG per Match
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[...matchData].sort((a, b) => a.summary.date.localeCompare(b.summary.date)).map((m, i) => {
                    const xg = m.shots.reduce((acc, s) => acc + (s.xg || 0), 0);
                    const goals = m.shots.filter((s) => s.outcome === "Goal").length;
                    const maxXg = Math.max(...matchData.map((md) => md.shots.reduce((acc, s) => acc + (s.xg || 0), 0)), 1);
                    const opponent = m.playerTeam === m.summary.homeTeam ? m.summary.awayTeam : m.summary.homeTeam;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", width: 72, textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          vs {opponent}
                        </div>
                        <div style={{ flex: 1, height: 18, background: "rgba(255,255,255,0.05)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(xg / maxXg) * 100}%`, background: goals > 0 ? GOAL_COLOR : HOME_COLOR, opacity: 0.7, borderRadius: 3, transition: "width 0.4s ease" }} />
                        </div>
                        <div style={{ fontSize: 10, color: goals > 0 ? GOAL_COLOR : "rgba(255,255,255,0.4)", width: 40, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                          {xg.toFixed(2)}{goals > 0 ? " ⚽" : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Match log */}
            <div>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                Match Log
              </h2>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {["Date", "Competition", "Opponent", "Result", "Goals", "Shots (xG)", "Passes"].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", fontWeight: 500 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matchData.map((m) => (
                      <MatchRow
                        key={m.summary.matchId}
                        summary={m.summary}
                        playerTeam={m.playerTeam}
                        shots={m.shots}
                        passes={m.passes}
                        onClick={() => setLocation(`/match/${m.summary.matchId}`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
