import type { MatchSummary } from "../types";

export function filterMatches(
  matches: MatchSummary[],
  {
    competition,
    team,
    search,
  }: {
    competition?: string;
    team?: string;
    search?: string;
  }
): MatchSummary[] {
  return matches.filter((m) => {
    if (competition && m.competition !== competition) return false;
    if (team && m.homeTeam !== team && m.awayTeam !== team) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !m.homeTeam.toLowerCase().includes(q) &&
        !m.awayTeam.toLowerCase().includes(q) &&
        !m.competition.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
}

export function getUniqueCompetitions(matches: MatchSummary[]): string[] {
  return [...new Set(matches.map((m) => m.competition))].sort();
}

export function getUniqueTeams(matches: MatchSummary[]): string[] {
  const teams = new Set<string>();
  matches.forEach((m) => {
    teams.add(m.homeTeam);
    teams.add(m.awayTeam);
  });
  return [...teams].sort();
}
