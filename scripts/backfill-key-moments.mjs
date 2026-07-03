/**
 * Backfills key-moments.json for every already-imported match folder.
 * Fetches minimal event data from StatsBomb GitHub for each match.
 *
 * Writes: public/data/matches/{matchId}/key-moments.json
 * Schema: { goals, bigChances, substitutions, cards }
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const matchesDir = join(root, "public", "data", "matches");
const BASE = "https://raw.githubusercontent.com/statsbomb/open-data/master/data";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function shortName(n) {
  if (!n) return "";
  const parts = n.trim().split(" ");
  return parts.length === 1 ? n : `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

async function processMatch(matchId) {
  const out = join(matchesDir, matchId, "key-moments.json");
  // Load locally-stored shots for goals + big chances (already processed)
  const shotsPath = join(matchesDir, matchId, "shots.json");
  const summaryPath = join(matchesDir, matchId, "summary.json");
  if (!existsSync(shotsPath) || !existsSync(summaryPath)) return null;

  const shots = JSON.parse(readFileSync(shotsPath, "utf8"));
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));

  const goals = shots
    .filter((s) => s.outcome === "Goal")
    .sort((a, b) => a.minute - b.minute)
    .map((s) => ({
      minute: s.minute,
      second: s.second ?? 0,
      team: s.team,
      scorer: s.player ?? "Unknown",
      xg: Math.round((s.xg ?? 0) * 1000) / 1000,
    }));

  const bigChances = shots
    .filter((s) => s.xg >= 0.25 && s.outcome !== "Goal")
    .sort((a, b) => b.xg - a.xg)
    .slice(0, 6)
    .map((s) => ({
      minute: s.minute,
      second: s.second ?? 0,
      team: s.team,
      player: s.player ?? "Unknown",
      xg: Math.round((s.xg ?? 0) * 1000) / 1000,
      outcome: s.outcome ?? "Unknown",
    }));

  // Fetch subs + cards from StatsBomb raw events
  let substitutions = [];
  let cards = [];
  try {
    const events = await fetchJson(`${BASE}/events/${matchId}.json`);
    for (const e of events) {
      const typeName = e.type?.name;
      if (typeName === "Substitution") {
        substitutions.push({
          minute: e.minute,
          second: e.second ?? 0,
          team: e.team?.name ?? "",
          playerOut: shortName(e.player?.name),
          playerIn: shortName(e.substitution?.replacement?.name),
          reason: e.substitution?.outcome?.name ?? "",
        });
      }
      if (typeName === "Foul Committed" && e.foul_committed?.card) {
        cards.push({
          minute: e.minute,
          second: e.second ?? 0,
          team: e.team?.name ?? "",
          player: shortName(e.player?.name),
          cardType: e.foul_committed.card?.name ?? "Yellow Card",
        });
      }
    }
    substitutions.sort((a, b) => a.minute - b.minute);
    cards.sort((a, b) => a.minute - b.minute);
  } catch (err) {
    console.warn(`  ⚠ Failed to fetch events for ${matchId}: ${err.message}`);
  }

  const result = { goals, bigChances, substitutions, cards };
  writeFileSync(out, JSON.stringify(result));
  return result;
}

async function main() {
  console.log("Backfilling key-moments.json for all matches...\n");
  const matchIds = readdirSync(matchesDir);
  let ok = 0, failed = 0;
  for (const id of matchIds) {
    process.stdout.write(`  ${id}... `);
    try {
      const r = await processMatch(id);
      if (r) {
        console.log(`✓  ${r.goals.length}g ${r.substitutions.length}subs ${r.cards.length}cards`);
        ok++;
      } else {
        console.log("skipped (missing data)");
      }
    } catch (e) {
      console.log(`✗  ${e.message}`);
      failed++;
    }
    await sleep(180);
  }
  console.log(`\n✅ Done — ${ok} processed, ${failed} failed`);
}

main().catch((e) => { console.error(e); process.exit(1); });
