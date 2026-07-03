export type MatchSummary = {
  matchId: string;
  competition: string;
  season: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homeXg: number;
  awayXg: number;
  homeShots?: number;
  awayShots?: number;
  homePasses?: number;
  awayPasses?: number;
  homePossession?: number;
  awayPossession?: number;
  source?: "statsbomb" | "understat";
};

export type MatchIndex = {
  matches: MatchSummary[];
};
