/**
 * StatsBomb Open Data importer
 * Downloads and processes match data into the format this app expects.
 * Usage: node scripts/import-statsbomb.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../public/data");
const BASE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Map StatsBomb event type name → our type string
function mapType(sb) {
  return sb;
}

function toMatchEvent(e) {
  return {
    id: e.id,
    index: e.index,
    period: e.period,
    minute: e.minute,
    second: e.second,
    timestamp: e.timestamp,
    team: e.team?.name ?? "",
    player: e.player?.name ?? null,
    type: e.type?.name ?? "",
    location: e.location ?? null,
    endLocation: e["carry"] ? e.carry?.end_location ?? null : e["pass"] ? e.pass?.end_location ?? null : null,
    outcome: e.shot?.outcome?.name ?? e.pass?.outcome?.name ?? e.duel?.outcome?.name ?? e["ball_recovery"]?.recovery_failure === false ? "Success" : null,
    possession: e.possession ?? null,
    xg: e.shot?.statsbomb_xg ?? null,
  };
}

function toShotEvent(e) {
  const base = toMatchEvent(e);
  return {
    ...base,
    xg: e.shot?.statsbomb_xg ?? 0,
    bodyPart: e.shot?.body_part?.name ?? null,
    technique: e.shot?.technique?.name ?? null,
    result: e.shot?.outcome?.name ?? "Unknown",
    outcome: e.shot?.outcome?.name ?? "Unknown",
    endLocation: e.shot?.end_location ?? null,
  };
}

function toPassEvent(e) {
  const base = toMatchEvent(e);
  return {
    ...base,
    endLocation: e.pass?.end_location ?? null,
    recipient: e.pass?.recipient?.name ?? null,
    length: e.pass?.length ?? null,
    angle: e.pass?.angle ?? null,
    height: e.pass?.height?.name ?? null,
    isKeyPass: e.pass?.technique?.name === "Through Ball" || e.pass?.goal_assist || false,
    assistedShotId: e.pass?.assisted_shot_id ?? null,
    outcome: e.pass?.outcome?.name ?? null,
  };
}

function buildXgTimeline(shots, homeTeam, awayTeam) {
  const homePts = [];
  const awayPts = [];
  let homeAcc = 0;
  let awayAcc = 0;

  const sorted = [...shots].sort((a, b) => a.minute * 60 + a.second - (b.minute * 60 + b.second));

  for (const s of sorted) {
    const xg = s.shot?.statsbomb_xg ?? 0;
    const isHome = s.team?.name === homeTeam;
    const isAway = s.team?.name === awayTeam;
    if (isHome) {
      homeAcc += xg;
      homePts.push({
        minute: s.minute,
        team: homeTeam,
        cumulativeXg: Math.round(homeAcc * 1000) / 1000,
        shotXg: Math.round(xg * 1000) / 1000,
        player: s.player?.name ?? "",
        outcome: s.shot?.outcome?.name ?? "",
      });
    } else if (isAway) {
      awayAcc += xg;
      awayPts.push({
        minute: s.minute,
        team: awayTeam,
        cumulativeXg: Math.round(awayAcc * 1000) / 1000,
        shotXg: Math.round(xg * 1000) / 1000,
        player: s.player?.name ?? "",
        outcome: s.shot?.outcome?.name ?? "",
      });
    }
  }

  return [...homePts, ...awayPts];
}

function buildGoalBuildUps(events, goals) {
  const buildUps = [];

  for (const goal of goals) {
    // Find build-up: look back up to 90 seconds before the goal within the same possession
    const goalIdx = events.findIndex((e) => e.id === goal.id);
    if (goalIdx === -1) continue;

    const goalPoss = events[goalIdx].possession;
    const goalMinute = goal.minute;
    const goalSecond = goal.second;

    // Go back to find the start of the previous possession loss / 90 seconds
    let startIdx = goalIdx;
    for (let i = goalIdx; i >= 0; i--) {
      const e = events[i];
      const secDiff = (goalMinute * 60 + goalSecond) - (e.minute * 60 + (e.second ?? 0));
      if (secDiff > 90) break;
      startIdx = i;
    }

    const sequence = events.slice(startIdx, goalIdx + 1);

    buildUps.push({
      goalEventId: goal.id,
      goalMinute: goal.minute,
      goalSecond: goal.second ?? 0,
      scorer: goal.player?.name ?? "Unknown",
      team: goal.team?.name ?? "",
      xg: goal.shot?.statsbomb_xg ?? 0,
      events: sequence.map((e) => ({
        id: e.id,
        index: e.index,
        period: e.period,
        minute: e.minute,
        second: e.second ?? 0,
        timestamp: e.timestamp,
        team: e.team?.name ?? "",
        player: e.player?.name ?? null,
        type: e.type?.name ?? "",
        location: e.location ?? null,
        endLocation: e.carry?.end_location ?? e.pass?.end_location ?? e.shot?.end_location ?? null,
        outcome: e.shot?.outcome?.name ?? e.pass?.outcome?.name ?? null,
        possession: e.possession ?? null,
        xg: e.shot?.statsbomb_xg ?? null,
      })),
    });
  }

  return buildUps;
}

function computePossession(events, homeTeam, awayTeam) {
  const byTeam = { [homeTeam]: 0, [awayTeam]: 0 };
  for (const e of events) {
    const tn = e.team?.name;
    if (tn === homeTeam || tn === awayTeam) byTeam[tn]++;
  }
  const total = byTeam[homeTeam] + byTeam[awayTeam] || 1;
  return {
    home: Math.round((byTeam[homeTeam] / total) * 100),
    away: Math.round((byTeam[awayTeam] / total) * 100),
  };
}

async function processMatch(match, competitionName) {
  const matchId = String(match.match_id);
  const homeTeam = match.home_team.home_team_name;
  const awayTeam = match.away_team.away_team_name;
  const homeScore = match.home_score;
  const awayScore = match.away_score;
  const date = match.match_date;
  const season = match.season?.season_name ?? "";

  console.log(`  Processing ${matchId}: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}...`);

  const outDir = path.join(DATA_DIR, "matches", matchId);
  fs.mkdirSync(outDir, { recursive: true });

  // Fetch raw events
  let events;
  try {
    events = await fetchJson(`${BASE_URL}/events/${matchId}.json`);
  } catch (e) {
    console.error(`    Failed to fetch events: ${e.message}`);
    return null;
  }

  // Fetch lineups
  let rawLineups;
  try {
    rawLineups = await fetchJson(`${BASE_URL}/lineups/${matchId}.json`);
  } catch (e) {
    rawLineups = [];
  }

  // Parse shots
  const shots = events.filter((e) => e.type?.name === "Shot").map(toShotEvent);

  // Parse passes (non-set-piece, non-GK throws)
  const passes = events
    .filter((e) => e.type?.name === "Pass" && e.player)
    .map(toPassEvent);

  // Parse carries
  const carries = events
    .filter((e) => e.type?.name === "Carry" && e.carry?.end_location)
    .map((e) => ({
      id: e.id,
      index: e.index,
      period: e.period,
      minute: e.minute,
      second: e.second ?? 0,
      timestamp: e.timestamp,
      team: e.team?.name ?? "",
      player: e.player?.name ?? null,
      type: "Carry",
      location: e.location ?? null,
      endLocation: e.carry?.end_location ?? null,
      outcome: null,
      possession: e.possession ?? null,
      xg: null,
    }));

  // Parse pressures
  const pressures = events
    .filter((e) => e.type?.name === "Pressure")
    .map((e) => ({
      id: e.id,
      index: e.index,
      period: e.period,
      minute: e.minute,
      second: e.second ?? 0,
      timestamp: e.timestamp,
      team: e.team?.name ?? "",
      player: e.player?.name ?? null,
      type: "Pressure",
      location: e.location ?? null,
      endLocation: null,
      outcome: null,
      possession: e.possession ?? null,
      xg: null,
    }));

  // Parse ball recoveries
  const recoveries = events
    .filter((e) => e.type?.name === "Ball Recovery")
    .map((e) => ({
      id: e.id,
      index: e.index,
      period: e.period,
      minute: e.minute,
      second: e.second ?? 0,
      timestamp: e.timestamp,
      team: e.team?.name ?? "",
      player: e.player?.name ?? null,
      type: "Ball Recovery",
      location: e.location ?? null,
      endLocation: null,
      outcome: e.ball_recovery?.recovery_failure === false ? "Success" : null,
      possession: e.possession ?? null,
      xg: null,
    }));

  // xG Timeline
  const xgTimeline = buildXgTimeline(
    events.filter((e) => e.type?.name === "Shot"),
    homeTeam,
    awayTeam
  );

  // Compute stats from events
  const homeShots = shots.filter((s) => s.team === homeTeam).length;
  const awayShots = shots.filter((s) => s.team === awayTeam).length;
  const homePasses = passes.filter((p) => p.team === homeTeam).length;
  const awayPasses = passes.filter((p) => p.team === awayTeam).length;
  const homeXg = shots
    .filter((s) => s.team === homeTeam)
    .reduce((sum, s) => sum + (s.xg ?? 0), 0);
  const awayXg = shots
    .filter((s) => s.team === awayTeam)
    .reduce((sum, s) => sum + (s.xg ?? 0), 0);
  const poss = computePossession(events, homeTeam, awayTeam);

  // Lineups
  const lineups = rawLineups.map((team) => ({
    teamId: team.team_id,
    teamName: team.team_name,
    players: (team.lineup ?? [])
      .filter((p) => p.positions && p.positions.length > 0)
      .slice(0, 16)
      .map((p) => ({
        id: p.player_id,
        name: p.player_name,
        jerseyNumber: p.jersey_number,
        country: p.country?.name ?? null,
        position: p.positions?.[0]?.position ?? null,
      })),
  }));

  // Goal build-ups
  const goalEvents = events.filter(
    (e) => e.type?.name === "Shot" && e.shot?.outcome?.name === "Goal"
  );
  const buildUps = buildGoalBuildUps(events, goalEvents);

  // Events lite
  const eventsLite = events.slice(0, 500).map(toMatchEvent);

  // Summary
  const summary = {
    matchId,
    competition: competitionName,
    season,
    date,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    homeXg: Math.round(homeXg * 100) / 100,
    awayXg: Math.round(awayXg * 100) / 100,
    homeShots,
    awayShots,
    homePasses,
    awayPasses,
    homePossession: poss.home,
    awayPossession: poss.away,
  };

  // Write files
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary));
  fs.writeFileSync(path.join(outDir, "shots.json"), JSON.stringify(shots));
  fs.writeFileSync(path.join(outDir, "passes.json"), JSON.stringify(passes));
  fs.writeFileSync(path.join(outDir, "carries.json"), JSON.stringify(carries));
  fs.writeFileSync(path.join(outDir, "pressures.json"), JSON.stringify(pressures));
  fs.writeFileSync(path.join(outDir, "recoveries.json"), JSON.stringify(recoveries));
  fs.writeFileSync(path.join(outDir, "xg-timeline.json"), JSON.stringify(xgTimeline));
  fs.writeFileSync(path.join(outDir, "lineups.json"), JSON.stringify(lineups));
  fs.writeFileSync(path.join(outDir, "buildups.json"), JSON.stringify(buildUps));
  fs.writeFileSync(path.join(outDir, "events-lite.json"), JSON.stringify(eventsLite));

  console.log(`    ✓ Done — ${shots.length} shots, ${passes.length} passes`);

  return summary;
}

async function importCompetition(competitionId, seasonId, competitionName, maxMatches = 10) {
  console.log(`\nFetching ${competitionName}...`);
  let matches;
  try {
    matches = await fetchJson(`${BASE_URL}/matches/${competitionId}/${seasonId}.json`);
  } catch (e) {
    console.error(`  Failed to fetch matches: ${e.message}`);
    return [];
  }

  // Sort by total goals descending — most exciting first
  matches.sort(
    (a, b) =>
      b.home_score + b.away_score - (a.home_score + a.away_score)
  );

  const toProcess = matches.slice(0, maxMatches);
  console.log(`  Found ${matches.length} matches, importing top ${toProcess.length}`);

  const summaries = [];
  for (const m of toProcess) {
    await sleep(200); // be gentle to GitHub CDN
    const summary = await processMatch(m, competitionName);
    if (summary) summaries.push(summary);
  }

  return summaries;
}

async function main() {
  console.log("StatsBomb Open Data Importer");
  console.log("============================\n");

  // Read existing index
  const indexPath = path.join(DATA_DIR, "matches-index.json");
  const existing = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const existingIds = new Set(existing.matches.map((m) => String(m.matchId)));

  const allNew = [];

  // UEFA Euro 2024 (competition_id: 55, season_id: 282) — all 51 matches
  const euro2024 = await importCompetition(55, 282, "UEFA Euro", 51);
  allNew.push(...euro2024.filter((m) => !existingIds.has(String(m.matchId))));

  // Merge and write updated index
  const merged = [...existing.matches, ...allNew];
  fs.writeFileSync(indexPath, JSON.stringify({ matches: merged }, null, 2));

  console.log(`\n✅ Done! Added ${allNew.length} new matches. Total: ${merged.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
