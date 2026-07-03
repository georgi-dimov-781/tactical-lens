import { useEffect, useState, useMemo } from "react";
import {
  loadPlayersIndex,
  loadMatchIndex,
  loadShots,
  loadPasses,
  type PlayerIndexEntry,
} from "@/lib/data/loadMatch";
import type { ShotEvent, MatchSummary } from "@/lib/types";

export interface MatchData {
  summary: MatchSummary;
  playerTeam: string;
  shots: ShotEvent[];
  passes: number;
}

export interface PlayerStats {
  goals: number;
  totalXg: number;
  totalShots: number;
  totalPasses: number;
  conversion: number;
  xgPerShot: number;
  passesPerMatch: number;
  matchCount: number;
}

export function calcStats(matchData: MatchData[]): PlayerStats {
  const allShots = matchData.flatMap((m) => m.shots);
  const goals = allShots.filter((s) => s.outcome === "Goal").length;
  const totalXg = allShots.reduce((acc, s) => acc + (s.xg || 0), 0);
  const totalPasses = matchData.reduce((acc, m) => acc + m.passes, 0);
  const conversion = allShots.length > 0 ? (goals / allShots.length) * 100 : 0;
  const xgPerShot = allShots.length > 0 ? totalXg / allShots.length : 0;
  const matchCount = matchData.length;
  return {
    goals,
    totalXg,
    totalShots: allShots.length,
    totalPasses,
    conversion,
    xgPerShot,
    passesPerMatch: matchCount > 0 ? totalPasses / matchCount : 0,
    matchCount,
  };
}

export function usePlayerData(playerId: number | null) {
  const [player, setPlayer] = useState<PlayerIndexEntry | null>(null);
  const [allMatches, setAllMatches] = useState<MatchSummary[]>([]);
  const [matchData, setMatchData] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    if (playerId == null) {
      setPlayer(null);
      setMatchData([]);
      return;
    }
    Promise.all([loadPlayersIndex(), loadMatchIndex()]).then(([players, matches]) => {
      const found = players.find((p) => p.id === playerId) ?? null;
      setPlayer(found);
      setAllMatches(matches);
    });
  }, [playerId]);

  useEffect(() => {
    if (!player || !allMatches.length) return;
    const playerMatchIds = new Set(player.matchIds.map(String));
    const relevant = allMatches
      .filter((m) => playerMatchIds.has(String(m.matchId)))
      .sort((a, b) => a.date.localeCompare(b.date));

    let cancelled = false;
    setLoading(true);
    setLoadedCount(0);
    setMatchData([]);
    const results: MatchData[] = [];

    (async () => {
      for (const summary of relevant) {
        if (cancelled) break;
        try {
          const [shotsRaw, passesRaw] = await Promise.all([
            loadShots(String(summary.matchId)),
            loadPasses(String(summary.matchId)),
          ]);
          const playerShots = shotsRaw.filter((s) => s.player === player.name);
          const playerPasses = passesRaw.filter((p) => p.player === player.name).length;
          const playerTeam =
            player.teams.find((t) => t === summary.homeTeam || t === summary.awayTeam) ??
            player.teams[0];
          results.push({ summary, playerTeam, shots: playerShots, passes: playerPasses });
          if (!cancelled) {
            setLoadedCount((c) => c + 1);
            setMatchData([...results]);
          }
        } catch {
          // skip
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [player, allMatches]);

  const stats = useMemo(() => calcStats(matchData), [matchData]);

  const annotatedShots = useMemo(() =>
    matchData.flatMap((m) => {
      const opponent =
        m.playerTeam === m.summary.homeTeam ? m.summary.awayTeam : m.summary.homeTeam;
      return m.shots.map((s) => ({
        ...s,
        matchLabel: `vs ${opponent} (${m.summary.date})`,
      }));
    }),
    [matchData]
  );

  return { player, matchData, stats, loading, loadedCount, annotatedShots };
}
