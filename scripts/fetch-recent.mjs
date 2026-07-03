/**
 * fetch-recent.mjs
 * Downloads recent matches from StatsBomb Open Data (GitHub).
 * Covers UEFA Euro 2024, Copa America 2024, Bundesliga 2023/24, and more.
 *
 * Usage:
 *   node scripts/fetch-recent.mjs [maxPerCompetition]
 *
 * Example:
 *   node scripts/fetch-recent.mjs 10
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../public/data");
const BASE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data";
const MAX_PER_COMP = parseInt(process.argv[2] ?? "10", 10);

const COMPETITIONS = [
  { id: 55,  seasonId: 282, name: "UEFA Euro",       season: "2024" },
  { id: 223, seasonId: 282, name: "Copa America",    season: "2024" },
  { id: 9,   seasonId: 281, name: "Bundesliga",      season: "2023/2024" },
  { id: 37,  seasonId: 281, name: "WSL",             season: "2023/2024" },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function normalizeTeamName(n) { return (n ?? "").replace(/Men's|Women's/g, "").replace(/  +/g, " ").trim(); }

function toMatchEvent(e) {
  return {
    id: e.id, index: e.index, period: e.period, minute: e.minute,
    second: e.second, timestamp: e.timestamp,
    team: e.team?.name ?? "", player: e.player?.name ?? null,
    type: e.type?.name ?? "",
    location: e.location ?? null,
    endLocation: e.carry?.end_location ?? e.pass?.end_location ?? null,
    outcome: e.shot?.outcome?.name ?? e.pass?.outcome?.name ?? null,
    possession: e.possession ?? null,
    xg: e.shot?.statsbomb_xg ?? null,
  };
}

function buildXgTimeline(shots, homeTeam, awayTeam) {
  let hAcc = 0, aAcc = 0;
  const sorted = [...shots].sort((a,b) => a.minute*60+a.second-(b.minute*60+b.second));
  return sorted.map(s => {
    const isHome = s.team?.name === homeTeam;
    const xg = s.shot?.statsbomb_xg ?? 0;
    if (isHome) hAcc += xg; else aAcc += xg;
    return {
      minute: s.minute, team: s.team?.name ?? "",
      cumulativeXg: Math.round((isHome ? hAcc : aAcc) * 1000) / 1000,
      shotXg: Math.round(xg * 1000) / 1000,
      player: s.player?.name ?? "", outcome: s.shot?.outcome?.name ?? "",
    };
  });
}

function buildGoalBuildUps(events, goalEvents) {
  return goalEvents.map(goal => {
    const goalIdx = events.findIndex(e => e.id === goal.id);
    if (goalIdx === -1) return null;
    const gMin = goal.minute * 60 + (goal.second ?? 0);
    let startIdx = goalIdx;
    for (let i = goalIdx; i >= 0; i--) {
      const e = events[i];
      if (gMin - (e.minute * 60 + (e.second ?? 0)) > 90) break;
      startIdx = i;
    }
    return {
      goalEventId: goal.id, goalMinute: goal.minute,
      goalSecond: goal.second ?? 0,
      scorer: goal.player?.name ?? "Unknown",
      team: goal.team?.name ?? "",
      xg: goal.shot?.statsbomb_xg ?? 0,
      events: events.slice(startIdx, goalIdx + 1).map(e => ({
        id: e.id, index: e.index, period: e.period,
        minute: e.minute, second: e.second ?? 0, timestamp: e.timestamp,
        team: e.team?.name ?? "", player: e.player?.name ?? null,
        type: e.type?.name ?? "",
        location: e.location ?? null,
        endLocation: e.carry?.end_location ?? e.pass?.end_location ?? e.shot?.end_location ?? null,
        outcome: e.shot?.outcome?.name ?? e.pass?.outcome?.name ?? null,
        possession: e.possession ?? null, xg: e.shot?.statsbomb_xg ?? null,
      })),
    };
  }).filter(Boolean);
}

async function processMatch(match, compName, season) {
  const matchId = String(match.match_id);
  const homeTeam = normalizeTeamName(match.home_team.home_team_name);
  const awayTeam = normalizeTeamName(match.away_team.away_team_name);
  const outDir = path.join(DATA_DIR, "matches", matchId);

  if (fs.existsSync(path.join(outDir, "summary.json"))) {
    const s = JSON.parse(fs.readFileSync(path.join(outDir, "summary.json"), "utf-8"));
    console.log(`  ⏭  ${matchId} exists — ${homeTeam} ${s.homeScore}-${s.awayScore} ${awayTeam}`);
    return s;
  }

  console.log(`  → ${matchId}: ${homeTeam} ${match.home_score}-${match.away_score} ${awayTeam}`);
  fs.mkdirSync(outDir, { recursive: true });

  let events = [], rawLineups = [];
  try {
    [events, rawLineups] = await Promise.all([
      fetchJson(`${BASE_URL}/events/${matchId}.json`),
      fetchJson(`${BASE_URL}/lineups/${matchId}.json`).catch(() => []),
    ]);
  } catch(e) {
    console.error(`    ✗ ${e.message}`); return null;
  }

  const shotEvents = events.filter(e => e.type?.name === "Shot");
  const shots = shotEvents.map(e => ({
    id: e.id, index: e.index, period: e.period, minute: e.minute,
    second: e.second ?? 0, timestamp: e.timestamp,
    team: e.team?.name ?? "", player: e.player?.name ?? null,
    type: "Shot", location: e.location ?? null,
    endLocation: e.shot?.end_location ?? null,
    result: e.shot?.outcome?.name ?? "Unknown",
    outcome: e.shot?.outcome?.name ?? "Unknown",
    xg: e.shot?.statsbomb_xg ?? 0,
    bodyPart: e.shot?.body_part?.name ?? null,
    technique: e.shot?.technique?.name ?? null,
  }));

  const passes = events.filter(e => e.type?.name === "Pass" && e.player).map(e => ({
    id: e.id, index: e.index, period: e.period, minute: e.minute,
    second: e.second ?? 0, timestamp: e.timestamp,
    team: e.team?.name ?? "", player: e.player?.name ?? null,
    type: "Pass", location: e.location ?? null,
    endLocation: e.pass?.end_location ?? null,
    recipient: e.pass?.recipient?.name ?? null,
    length: e.pass?.length ?? null, angle: e.pass?.angle ?? null,
    height: e.pass?.height?.name ?? null,
    isKeyPass: !!(e.pass?.goal_assist || e.pass?.technique?.name === "Through Ball"),
    assistedShotId: e.pass?.assisted_shot_id ?? null,
    outcome: e.pass?.outcome?.name ?? null,
    possession: e.possession ?? null, xg: null,
  }));

  const carries = events.filter(e => e.type?.name === "Carry" && e.carry?.end_location).map(e => ({
    id: e.id, index: e.index, period: e.period, minute: e.minute,
    second: e.second ?? 0, timestamp: e.timestamp,
    team: e.team?.name ?? "", player: e.player?.name ?? null,
    type: "Carry", location: e.location ?? null,
    endLocation: e.carry?.end_location ?? null,
    outcome: null, possession: e.possession ?? null, xg: null,
  }));

  const pressures = events.filter(e => e.type?.name === "Pressure").map(e => ({
    id: e.id, index: e.index, period: e.period, minute: e.minute,
    second: e.second ?? 0, timestamp: e.timestamp,
    team: e.team?.name ?? "", player: e.player?.name ?? null,
    type: "Pressure", location: e.location ?? null,
    endLocation: null, outcome: null, possession: e.possession ?? null, xg: null,
  }));

  const recoveries = events.filter(e => e.type?.name === "Ball Recovery").map(e => ({
    id: e.id, index: e.index, period: e.period, minute: e.minute,
    second: e.second ?? 0, timestamp: e.timestamp,
    team: e.team?.name ?? "", player: e.player?.name ?? null,
    type: "Ball Recovery", location: e.location ?? null,
    endLocation: null, outcome: null, possession: e.possession ?? null, xg: null,
  }));

  const xgTimeline = buildXgTimeline(shotEvents, homeTeam, awayTeam);
  const goalEvts = events.filter(e => e.type?.name === "Shot" && e.shot?.outcome?.name === "Goal");
  const buildUps = buildGoalBuildUps(events, goalEvts);
  const eventsLite = events.slice(0, 500).map(toMatchEvent);

  const lineups = rawLineups.map(team => ({
    teamId: team.team_id,
    teamName: normalizeTeamName(team.team_name),
    players: (team.lineup ?? [])
      .filter(p => p.positions?.length > 0)
      .slice(0, 16)
      .map(p => ({
        id: p.player_id, name: p.player_name,
        jerseyNumber: p.jersey_number,
        country: p.country?.name ?? null,
        position: p.positions?.[0]?.position ?? null,
      })),
  }));

  const homeXg = shots.filter(s => s.team === homeTeam).reduce((a,s) => a + (s.xg??0), 0);
  const awayXg = shots.filter(s => s.team === awayTeam).reduce((a,s) => a + (s.xg??0), 0);
  const total = events.length || 1;
  const hEvts = events.filter(e => e.team?.name === homeTeam).length;
  const poss = { home: Math.round(hEvts/total*100), away: Math.round((1-hEvts/total)*100) };

  const summary = {
    matchId, competition: compName, season, date: match.match_date,
    homeTeam, awayTeam,
    homeScore: match.home_score, awayScore: match.away_score,
    homeXg: Math.round(homeXg*100)/100, awayXg: Math.round(awayXg*100)/100,
    homeShots: shots.filter(s => s.team===homeTeam).length,
    awayShots: shots.filter(s => s.team===awayTeam).length,
    homePasses: passes.filter(p => p.team===homeTeam).length,
    awayPasses: passes.filter(p => p.team===awayTeam).length,
    homePossession: poss.home, awayPossession: poss.away,
  };

  fs.writeFileSync(path.join(outDir,"summary.json"), JSON.stringify(summary));
  fs.writeFileSync(path.join(outDir,"shots.json"), JSON.stringify(shots));
  fs.writeFileSync(path.join(outDir,"passes.json"), JSON.stringify(passes));
  fs.writeFileSync(path.join(outDir,"carries.json"), JSON.stringify(carries));
  fs.writeFileSync(path.join(outDir,"pressures.json"), JSON.stringify(pressures));
  fs.writeFileSync(path.join(outDir,"recoveries.json"), JSON.stringify(recoveries));
  fs.writeFileSync(path.join(outDir,"xg-timeline.json"), JSON.stringify(xgTimeline));
  fs.writeFileSync(path.join(outDir,"lineups.json"), JSON.stringify(lineups));
  fs.writeFileSync(path.join(outDir,"buildups.json"), JSON.stringify(buildUps));
  fs.writeFileSync(path.join(outDir,"events-lite.json"), JSON.stringify(eventsLite));

  console.log(`    ✓ ${shots.length} shots, ${passes.length} passes, ${goalEvts.length} goals`);
  return summary;
}

async function main() {
  const indexPath = path.join(DATA_DIR, "matches-index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  const existingIds = new Set(index.matches.map(m => String(m.matchId)));
  const newSummaries = [];

  for (const comp of COMPETITIONS) {
    console.log(`\n📥 ${comp.name} ${comp.season} (up to ${MAX_PER_COMP} matches)`);
    let matches;
    try {
      matches = await fetchJson(`${BASE_URL}/matches/${comp.id}/${comp.seasonId}.json`);
    } catch(e) {
      console.error(`  ✗ ${e.message}`); continue;
    }

    // Most exciting (high goal count) first
    matches.sort((a,b) => (b.home_score+b.away_score) - (a.home_score+a.away_score));
    const toProcess = matches.slice(0, MAX_PER_COMP);
    console.log(`  Found ${matches.length} matches, importing ${toProcess.length}`);

    for (const m of toProcess) {
      await sleep(300);
      const s = await processMatch(m, comp.name, comp.season);
      if (s && !existingIds.has(String(s.matchId))) {
        newSummaries.push(s);
        existingIds.add(String(s.matchId));
      }
    }
  }

  if (newSummaries.length > 0) {
    index.matches.unshift(...newSummaries.reverse());
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`\n✅ Added ${newSummaries.length} new matches. Total: ${index.matches.length}`);
  } else {
    console.log("\n✅ No new matches to add (all already imported).");
  }
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
