#!/usr/bin/env node
/**
 * Tactical Lens — StatsBomb Open Data Preprocessor
 * Fetches curated matches and generates static JSON files in public/data/
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/data");
const MATCHES_DIR = join(OUT_DIR, "matches");
const SB_BASE = "https://raw.githubusercontent.com/statsbomb/open-data/master/data";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function write(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 0));
}

// Curated list of interesting matches: [competitionId, seasonId]
const CURATED = [
  // FIFA World Cup 2018
  [43, 3],
  // UEFA Women's Euro 2022
  [53, 106],
  // NWSL Season 2018
  [49, 3],
  // FIFA World Cup 2022
  [43, 106],
  // UEFA Euro 2020
  [55, 43],
  // La Liga 2015/16 (Messi era)
  [11, 26],
];

// We'll pick the most interesting matches based on scoreline
function isInteresting(match) {
  const totalGoals = (match.home_score || 0) + (match.away_score || 0);
  return totalGoals >= 2; // filter for matches with action
}

function normalizeTeamName(name) {
  if (!name) return "";
  return name
    .replace("Men's", "").replace("Women's", "")
    .replace("  ", " ").trim();
}

async function processMatch(match, competition, season) {
  const matchId = String(match.match_id);
  const matchDir = join(MATCHES_DIR, matchId);
  mkdirSync(matchDir, { recursive: true });

  console.log(`  Processing match ${matchId}: ${match.home_team.home_team_name} vs ${match.away_team.away_team_name}`);

  // Fetch raw events and lineups
  const [rawEvents, rawLineups] = await Promise.all([
    fetchJson(`${SB_BASE}/events/${matchId}.json`).catch(() => []),
    fetchJson(`${SB_BASE}/lineups/${matchId}.json`).catch(() => []),
  ]);

  if (!rawEvents.length) {
    console.log(`    Skipping — no events`);
    return null;
  }

  // --- Process lineups ---
  const lineups = rawLineups.map((team) => ({
    teamId: team.team_id,
    teamName: normalizeTeamName(team.team_name),
    players: (team.lineup || []).slice(0, 16).map((p) => ({
      id: p.player_id,
      name: p.player_name,
      jerseyNumber: p.jersey_number,
      country: p.country?.name,
      position: p.positions?.[0]?.position || null,
    })),
  }));

  // --- Build team names ---
  const homeTeam = normalizeTeamName(match.home_team.home_team_name);
  const awayTeam = normalizeTeamName(match.away_team.away_team_name);

  // --- Filter events ---
  const shots = [];
  const passes = [];
  const carries = [];
  const pressures = [];
  const recoveries = [];
  const eventsLite = [];

  let homeXg = 0;
  let awayXg = 0;
  let homePasses = 0;
  let awayPasses = 0;
  const possessionCounts = { [homeTeam]: 0, [awayTeam]: 0 };

  // Build xG timeline
  const xgByTeam = {};
  xgByTeam[homeTeam] = 0;
  xgByTeam[awayTeam] = 0;
  const xgTimeline = [];

  for (const ev of rawEvents) {
    const team = normalizeTeamName(ev.team?.name);
    const player = ev.player?.name || null;
    const type = ev.type?.name || "Unknown";
    const location = ev.location || null;
    const period = ev.period || 1;
    const minute = ev.minute || 0;
    const second = ev.second || 0;

    const lite = {
      id: ev.id,
      index: ev.index,
      period,
      minute,
      second,
      timestamp: ev.timestamp || "",
      team,
      player,
      type,
      location,
      endLocation: ev["carry"]?.end_location || ev["pass"]?.end_location || null,
      outcome: ev[type.toLowerCase()]?.outcome?.name || null,
      possession: ev.possession || null,
    };

    if (type === "Shot") {
      const shotXg = ev.shot?.statsbomb_xg || 0;
      const result = ev.shot?.outcome?.name || "Unknown";
      const shotEv = {
        ...lite,
        xg: shotXg,
        bodyPart: ev.shot?.body_part?.name || null,
        technique: ev.shot?.technique?.name || null,
        result,
        endLocation: ev.shot?.end_location || null,
      };
      shots.push(shotEv);

      if (team === homeTeam) homeXg += shotXg;
      else if (team === awayTeam) awayXg += shotXg;

      if (!xgByTeam[team]) xgByTeam[team] = 0;
      xgByTeam[team] += shotXg;

      xgTimeline.push({
        minute,
        team,
        cumulativeXg: parseFloat(xgByTeam[team].toFixed(3)),
        shotXg: parseFloat(shotXg.toFixed(3)),
        player: player || "Unknown",
        outcome: result,
      });
    }

    if (type === "Pass") {
      passes.push({
        ...lite,
        recipient: ev.pass?.recipient?.name || null,
        length: ev.pass?.length ? parseFloat(ev.pass.length.toFixed(1)) : null,
        angle: ev.pass?.angle ? parseFloat(ev.pass.angle.toFixed(3)) : null,
        height: ev.pass?.height?.name || null,
        isKeyPass: ev.pass?.key_pass === true,
        assistedShotId: ev.pass?.assisted_shot_id || null,
        endLocation: ev.pass?.end_location || null,
        outcome: ev.pass?.outcome?.name || "Complete",
      });
      if (team === homeTeam) homePasses++;
      else if (team === awayTeam) awayPasses++;
    }

    if (type === "Carry") {
      carries.push({
        ...lite,
        endLocation: ev.carry?.end_location || null,
      });
    }

    if (type === "Pressure") {
      pressures.push(lite);
    }

    if (type === "Ball Recovery") {
      recoveries.push(lite);
    }

    // Track possession
    if (possessionCounts[team] !== undefined) {
      possessionCounts[team]++;
    }

    eventsLite.push(lite);
  }

  // --- Compute possession % ---
  const totalPossession = Object.values(possessionCounts).reduce((a, b) => a + b, 0);
  const homePossession = totalPossession
    ? Math.round((possessionCounts[homeTeam] / totalPossession) * 100)
    : 50;
  const awayPossession = 100 - homePossession;

  // --- Build goal build-ups ---
  const goalEvents = shots.filter((s) => s.result === "Goal");
  const buildUps = goalEvents.map((goal) => {
    const goalTime = goal.minute * 60 + goal.second;
    const windowEvents = eventsLite.filter((ev) => {
      const evTime = ev.minute * 60 + ev.second;
      return evTime >= goalTime - 45 && evTime <= goalTime;
    });
    return {
      goalEventId: goal.id,
      goalMinute: goal.minute,
      goalSecond: goal.second,
      scorer: goal.player || "Unknown",
      team: goal.team,
      xg: goal.xg,
      events: windowEvents,
    };
  });

  // --- Summary ---
  const summary = {
    matchId,
    competition: competition.competition_name,
    season: season.season_name,
    date: match.match_date,
    homeTeam,
    awayTeam,
    homeScore: match.home_score || 0,
    awayScore: match.away_score || 0,
    homeXg: parseFloat(homeXg.toFixed(2)),
    awayXg: parseFloat(awayXg.toFixed(2)),
    homeShots: shots.filter((s) => s.team === homeTeam).length,
    awayShots: shots.filter((s) => s.team === awayTeam).length,
    homePasses,
    awayPasses,
    homePossession,
    awayPossession,
  };

  // --- Write all files ---
  write(join(matchDir, "summary.json"), summary);
  write(join(matchDir, "events-lite.json"), eventsLite.slice(0, 2000)); // cap for file size
  write(join(matchDir, "shots.json"), shots);
  write(join(matchDir, "passes.json"), passes.slice(0, 1000)); // cap for file size
  write(join(matchDir, "carries.json"), carries.slice(0, 800));
  write(join(matchDir, "pressures.json"), pressures.slice(0, 800));
  write(join(matchDir, "recoveries.json"), recoveries.slice(0, 500));
  write(join(matchDir, "xg-timeline.json"), xgTimeline);
  write(join(matchDir, "lineups.json"), lineups);
  write(join(matchDir, "buildups.json"), buildUps);

  console.log(`    ✓ ${shots.length} shots, ${passes.length} passes, ${buildUps.length} goals`);
  return summary;
}

async function main() {
  console.log("🔍 Fetching StatsBomb Open Data...\n");
  mkdirSync(OUT_DIR, { recursive: true });

  const competitions = await fetchJson(`${SB_BASE}/competitions.json`);
  const allSummaries = [];
  let matchCount = 0;
  const MAX_MATCHES = 20;

  for (const [compId, seasonId] of CURATED) {
    if (matchCount >= MAX_MATCHES) break;
    const competition = competitions.find(
      (c) => c.competition_id === compId && c.season_id === seasonId
    );
    if (!competition) {
      console.log(`Competition ${compId}/${seasonId} not found, skipping`);
      continue;
    }

    console.log(`\n📋 ${competition.competition_name} — ${competition.season_name}`);

    const matches = await fetchJson(
      `${SB_BASE}/matches/${compId}/${seasonId}.json`
    ).catch(() => []);

    // Sort by total goals descending (most exciting first) then by date
    const interesting = matches
      .filter(isInteresting)
      .sort((a, b) => {
        const goalsB = (b.home_score + b.away_score);
        const goalsA = (a.home_score + a.away_score);
        return goalsB - goalsA;
      })
      .slice(0, Math.min(5, MAX_MATCHES - matchCount));

    for (const match of interesting) {
      if (matchCount >= MAX_MATCHES) break;
      try {
        const summary = await processMatch(match, competition, competition);
        if (summary) {
          allSummaries.push(summary);
          matchCount++;
        }
      } catch (err) {
        console.error(`  ✗ Failed: ${err.message}`);
      }
      // Small delay to be respectful to GitHub
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Write match index
  write(join(OUT_DIR, "matches-index.json"), { matches: allSummaries });
  console.log(`\n✅ Done! Generated data for ${allSummaries.length} matches.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
