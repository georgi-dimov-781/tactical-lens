/**
 * Reads all lineups.json files and emits public/data/players-index.json
 * Shape: Array<{ id: number, name: string, country: string, matchIds: number[], teams: string[] }>
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const matchesDir = join(root, "public", "data", "matches");
const outPath = join(root, "public", "data", "players-index.json");

const matchDirs = readdirSync(matchesDir);

// player id → { id, name, country, matchIds: Set, teams: Set }
const playerMap = new Map();

for (const matchId of matchDirs) {
  const lineupsPath = join(matchesDir, matchId, "lineups.json");
  if (!existsSync(lineupsPath)) continue;

  const lineups = JSON.parse(readFileSync(lineupsPath, "utf8"));
  for (const team of lineups) {
    for (const player of team.players ?? []) {
      const key = player.id;
      if (!playerMap.has(key)) {
        playerMap.set(key, {
          id: player.id,
          name: player.name,
          country: player.country ?? "",
          matchIds: new Set(),
          teams: new Set(),
        });
      }
      const entry = playerMap.get(key);
      entry.matchIds.add(Number(matchId));
      entry.teams.add(team.teamName);
    }
  }
}

const players = [...playerMap.values()]
  .map((p) => ({
    id: p.id,
    name: p.name,
    country: p.country,
    matchIds: [...p.matchIds],
    teams: [...p.teams],
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(outPath, JSON.stringify(players, null, 2));
console.log(`✅  ${players.length} players written to players-index.json`);
