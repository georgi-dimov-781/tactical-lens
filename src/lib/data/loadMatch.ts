import type { MatchSummary, MatchEvent, ShotEvent, PassEvent, XgPoint, GoalBuildUp } from "../types";
import type { Lineup } from "../types/player";

const BASE = import.meta.env.BASE_URL;

function dataUrl(path: string) {
  return `${BASE}data/${path}`;
}

export async function loadMatchIndex(): Promise<MatchSummary[]> {
  const res = await fetch(dataUrl("matches-index.json"));
  if (!res.ok) throw new Error("Failed to load match index");
  const data = await res.json();
  return data.matches as MatchSummary[];
}

export async function loadMatchSummary(matchId: string): Promise<MatchSummary> {
  const res = await fetch(dataUrl(`matches/${matchId}/summary.json`));
  if (!res.ok) throw new Error(`Failed to load summary for ${matchId}`);
  return res.json();
}

export async function loadEvents(matchId: string): Promise<MatchEvent[]> {
  const res = await fetch(dataUrl(`matches/${matchId}/events-lite.json`));
  if (!res.ok) throw new Error(`Failed to load events for ${matchId}`);
  return res.json();
}

export async function loadShots(matchId: string): Promise<ShotEvent[]> {
  const res = await fetch(dataUrl(`matches/${matchId}/shots.json`));
  if (!res.ok) throw new Error(`Failed to load shots for ${matchId}`);
  return res.json();
}

export async function loadPasses(matchId: string): Promise<PassEvent[]> {
  const res = await fetch(dataUrl(`matches/${matchId}/passes.json`));
  if (!res.ok) throw new Error(`Failed to load passes for ${matchId}`);
  return res.json();
}

export async function loadXgTimeline(matchId: string): Promise<XgPoint[]> {
  const res = await fetch(dataUrl(`matches/${matchId}/xg-timeline.json`));
  if (!res.ok) throw new Error(`Failed to load xg timeline for ${matchId}`);
  return res.json();
}

export async function loadLineups(matchId: string): Promise<Lineup[]> {
  const res = await fetch(dataUrl(`matches/${matchId}/lineups.json`));
  if (!res.ok) throw new Error(`Failed to load lineups for ${matchId}`);
  return res.json();
}

export async function loadGoalBuildUps(matchId: string): Promise<GoalBuildUp[]> {
  const res = await fetch(dataUrl(`matches/${matchId}/buildups.json`));
  if (!res.ok) throw new Error(`Failed to load build-ups for ${matchId}`);
  return res.json();
}

export async function loadKeyMoments(matchId: string) {
  const res = await fetch(dataUrl(`matches/${matchId}/key-moments.json`));
  if (!res.ok) throw new Error(`Failed to load key moments for ${matchId}`);
  return res.json();
}

export async function loadCarries(matchId: string): Promise<MatchEvent[]> {
  const res = await fetch(dataUrl(`matches/${matchId}/carries.json`));
  if (!res.ok) return [];
  return res.json();
}

export async function loadPressures(matchId: string): Promise<MatchEvent[]> {
  const res = await fetch(dataUrl(`matches/${matchId}/pressures.json`));
  if (!res.ok) return [];
  return res.json();
}

export async function loadRecoveries(matchId: string): Promise<MatchEvent[]> {
  const res = await fetch(dataUrl(`matches/${matchId}/recoveries.json`));
  if (!res.ok) return [];
  return res.json();
}

export interface PlayerIndexEntry {
  id: number;
  name: string;
  country: string;
  matchIds: number[];
  teams: string[];
}

let _playersCache: PlayerIndexEntry[] | null = null;

export async function loadPlayersIndex(): Promise<PlayerIndexEntry[]> {
  if (_playersCache) return _playersCache;
  const res = await fetch(dataUrl("players-index.json"));
  if (!res.ok) throw new Error("Failed to load players index");
  _playersCache = await res.json();
  return _playersCache!;
}
