/**
 * fetch-understat.mjs
 * Uses a headless Chromium browser to scrape Understat match data.
 * Understat loads data via JavaScript, so a real browser is required.
 *
 * Usage:
 *   node scripts/fetch-understat.mjs [league] [season] [limit]
 *
 * Examples:
 *   node scripts/fetch-understat.mjs EPL 2024 10
 *   node scripts/fetch-understat.mjs La_liga 2024 8
 *
 * Supported leagues: EPL, La_liga, Bundesliga, Serie_A, Ligue_1
 */

import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../public/data");
const INDEX_FILE = path.join(DATA_DIR, "matches-index.json");

const LEAGUE  = process.argv[2] ?? "EPL";
const SEASON  = process.argv[3] ?? "2024";
const LIMIT   = parseInt(process.argv[4] ?? "10", 10);

// ─── Find system Chromium ──────────────────────────────────────────────────
import { execSync } from "child_process";

function findChromium() {
  const candidates = [
    "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium",
  ];
  // Also try PATH
  try { candidates.unshift(execSync("which chromium").toString().trim()); } catch {}
  try { candidates.unshift(execSync("which chromium-browser").toString().trim()); } catch {}
  try { candidates.unshift(execSync("which google-chrome-stable").toString().trim()); } catch {}

  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  // Last resort: scan nix store
  try {
    const found = execSync("find /nix/store -name 'chromium' -type f 2>/dev/null | grep 'bin/chromium' | head -1")
      .toString().trim();
    if (found) return found;
  } catch {}
  throw new Error("Chromium not found. Install it with: installSystemDependencies(['chromium'])");
}

const CHROMIUM_PATH = findChromium();
console.log("Using Chromium:", CHROMIUM_PATH);

// ─── Result / body-part mapping ────────────────────────────────────────────
const RESULT_MAP = {
  Goal: "Goal", SavedShot: "Saved", BlockedShot: "Blocked",
  MissedShots: "Off T", ShotOnPost: "Off T",
};
const BODY_MAP = { RightFoot: "Right Foot", LeftFoot: "Left Foot", Head: "Head" };

const LEAGUE_LABELS = {
  EPL: "Premier League", La_liga: "La Liga",
  Bundesliga: "Bundesliga", Serie_A: "Serie A", Ligue_1: "Ligue 1",
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Launch browser ────────────────────────────────────────────────────────
async function launchBrowser() {
  return puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--no-first-run",
      "--disable-background-networking",
      "--disable-default-apps",
      "--mute-audio",
      "--window-size=1280,800",
    ],
  });
}

// ─── Extract JS variable from page context ─────────────────────────────────
async function extractVar(page, varName) {
  try {
    return await page.evaluate((v) => {
      // eslint-disable-next-line no-undef
      return typeof window[v] !== "undefined" ? window[v] : null;
    }, varName);
  } catch {
    return null;
  }
}

// ─── Fetch league match list ───────────────────────────────────────────────
async function fetchLeagueMatches(browser) {
  const url = `https://understat.com/league/${LEAGUE}/${SEASON}`;
  console.log(`\nOpening ${url}…`);
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  const datesData = await extractVar(page, "datesData");
  await page.close();

  if (!datesData) throw new Error("Could not read datesData from league page");

  const completed = datesData
    .filter((m) => m.isResult)
    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
    .slice(0, LIMIT);

  console.log(`  Found ${datesData.length} matches — using ${completed.length} most recent`);
  return completed;
}

// ─── Fetch a single match ──────────────────────────────────────────────────
async function fetchMatchData(browser, matchMeta) {
  const url = `https://understat.com/match/${matchMeta.id}`;
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    const [shotsData, rostersData, matchInfo] = await Promise.all([
      extractVar(page, "shotsData"),
      extractVar(page, "rostersData"),
      extractVar(page, "matchInfo"),
    ]);
    return { shotsData, rostersData, matchInfo };
  } finally {
    await page.close();
  }
}

// ─── Convert Understat shot → app ShotEvent ────────────────────────────────
// Understat X/Y: 0–1, attacker's perspective (X=1 near goal being attacked)
// App uses StatsBomb-like coords [0–120, 0–80]
function convertShot(s, homeTeam, awayTeam, idx) {
  const team = s.h_a === "h" ? homeTeam : awayTeam;
  const x = parseFloat(s.X) * 120;
  const y = parseFloat(s.Y) * 80;
  const minute = parseInt(s.minute, 10);
  return {
    id: `us_${s.id}`,
    index: idx,
    period: minute <= 45 ? 1 : 2,
    minute,
    second: 0,
    timestamp: `00:${String(minute).padStart(2, "0")}:00.000`,
    team,
    player: s.player ?? null,
    type: "Shot",
    location: [parseFloat(x.toFixed(2)), parseFloat(y.toFixed(2))],
    result: RESULT_MAP[s.result] ?? s.result,
    outcome: RESULT_MAP[s.result] ?? s.result,
    xg: parseFloat(parseFloat(s.xG).toFixed(4)),
    bodyPart: BODY_MAP[s.shotType] ?? s.shotType ?? null,
    situation: s.situation ?? null,
  };
}

// ─── Build xG timeline ─────────────────────────────────────────────────────
function buildXgTimeline(shots, homeTeam, awayTeam) {
  let runH = 0, runA = 0;
  return [...shots]
    .sort((a, b) => a.minute - b.minute || a.index - b.index)
    .map((s) => {
      const isHome = s.team === homeTeam;
      if (isHome) runH += s.xg; else runA += s.xg;
      return {
        minute: s.minute, team: s.team,
        cumulativeXg: parseFloat((isHome ? runH : runA).toFixed(4)),
        shotXg: s.xg, player: s.player ?? "Unknown", outcome: s.result,
      };
    });
}

// ─── Build lineups from rostersData ───────────────────────────────────────
const POS_MAP = {
  GK:"Goalkeeper", D:"Center Back", DL:"Left Back", DR:"Right Back",
  DC:"Center Back", DLC:"Left Center Back", DRC:"Right Center Back",
  ML:"Left Midfield", MR:"Right Midfield", MC:"Center Midfield",
  MLC:"Left Center Midfield", MRC:"Right Center Midfield",
  AMC:"Center Attacking Midfield", AML:"Left Wing", AMR:"Right Wing",
  FW:"Center Forward", FWL:"Left Wing", FWR:"Right Wing", FWC:"Center Forward",
};

function buildLineups(rostersData, homeTeam, awayTeam) {
  if (!rostersData) return [];
  return Object.entries(rostersData).map(([side, roster]) => ({
    teamId: side === "h" ? 1 : 2,
    teamName: side === "h" ? homeTeam : awayTeam,
    players: Object.values(roster).map((p, i) => ({
      id: parseInt(p.player_id, 10),
      name: p.player,
      jerseyNumber: p.roster_number ? parseInt(p.roster_number, 10) : i + 1,
      country: null,
      position: POS_MAP[p.position] ?? null,
    })),
  }));
}

// ─── Goal build-ups (shot-only) ────────────────────────────────────────────
function buildBuildUps(shots) {
  return shots
    .filter((s) => s.result === "Goal")
    .map((s) => ({
      goalEventId: s.id, goalMinute: s.minute, goalSecond: 0,
      scorer: s.player ?? "Unknown", team: s.team, xg: s.xg,
      events: [{ ...s, endLocation: null, possession: null }],
    }));
}

// ─── Save match to disk ────────────────────────────────────────────────────
function saveMatch(matchId, files) {
  const dir = path.join(DATA_DIR, "matches", matchId);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, data] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), JSON.stringify(data));
  }
}

// ─── Update match index ────────────────────────────────────────────────────
function updateIndex(newEntries) {
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
  const existingIds = new Set(index.matches.map((m) => m.matchId));
  let added = 0;
  for (const e of newEntries) {
    if (!existingIds.has(e.matchId)) { index.matches.unshift(e); added++; }
  }
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`\n✅ Index updated — +${added} new, total ${index.matches.length}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const browser = await launchBrowser();
  console.log("Browser launched ✓");

  let leagueMatches;
  try {
    leagueMatches = await fetchLeagueMatches(browser);
  } catch (e) {
    await browser.close();
    throw e;
  }

  const indexEntries = [];

  for (let i = 0; i < leagueMatches.length; i++) {
    const meta    = leagueMatches[i];
    const matchId = `us_${meta.id}`;
    const homeTeam = meta.h.title;
    const awayTeam = meta.a.title;
    const homeScore = parseInt(meta.goals.h, 10);
    const awayScore = parseInt(meta.goals.a, 10);

    // Skip if already fetched
    const summaryPath = path.join(DATA_DIR, "matches", matchId, "summary.json");
    if (fs.existsSync(summaryPath)) {
      console.log(`  ⏭  ${matchId} exists (${homeTeam} ${homeScore}–${awayScore} ${awayTeam})`);
      indexEntries.push(JSON.parse(fs.readFileSync(summaryPath, "utf-8")));
      continue;
    }

    console.log(`\n[${i+1}/${leagueMatches.length}] ${homeTeam} ${homeScore}–${awayScore} ${awayTeam} (${meta.datetime.slice(0,10)})`);

    let data;
    try {
      data = await fetchMatchData(browser, meta);
    } catch (e) {
      console.error(`  ✗ ${e.message}`);
      await sleep(2000);
      continue;
    }

    const { shotsData, rostersData } = data;
    const homeShots = (shotsData?.h ?? []).map((s, i) => convertShot(s, homeTeam, awayTeam, i));
    const awayShots = (shotsData?.a ?? []).map((s, i) =>
      convertShot(s, homeTeam, awayTeam, homeShots.length + i)
    );
    const allShots = [...homeShots, ...awayShots].sort((a, b) => a.minute - b.minute);

    const homeXg = homeShots.reduce((s, x) => s + x.xg, 0);
    const awayXg = awayShots.reduce((s, x) => s + x.xg, 0);

    const summary = {
      matchId,
      competition: LEAGUE_LABELS[LEAGUE] ?? LEAGUE,
      season: SEASON === "2024" ? "2024/2025" : SEASON,
      date: meta.datetime.slice(0, 10),
      homeTeam, awayTeam, homeScore, awayScore,
      homeXg: Math.round(homeXg * 100) / 100,
      awayXg: Math.round(awayXg * 100) / 100,
      homeShots: homeShots.length,
      awayShots: awayShots.length,
      homePasses: 0, awayPasses: 0,
      homePossession: 50, awayPossession: 50,
      source: "understat",
    };

    saveMatch(matchId, {
      "summary.json":     summary,
      "shots.json":       allShots,
      "passes.json":      [],
      "carries.json":     [],
      "pressures.json":   [],
      "recoveries.json":  [],
      "xg-timeline.json": buildXgTimeline(allShots, homeTeam, awayTeam),
      "lineups.json":     buildLineups(rostersData, homeTeam, awayTeam),
      "buildups.json":    buildBuildUps(allShots),
      "events-lite.json": [],
    });

    console.log(`  ✓ ${allShots.length} shots  (home xG ${summary.homeXg} – ${summary.awayXg} away)`);
    indexEntries.push(summary);

    // Small delay between pages — be polite
    if (i < leagueMatches.length - 1) await sleep(2000);
  }

  await browser.close();
  updateIndex(indexEntries);
}

main().catch(async (e) => {
  console.error("\n❌", e.message);
  process.exit(1);
});
