import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { loadMatchIndex } from "@/lib/data/loadMatch";
import { filterMatches, getUniqueCompetitions, getUniqueTeams } from "@/lib/data/matchIndex";
import type { MatchSummary } from "@/lib/types";
import { PlayerSearch } from "@/components/search/PlayerSearch";
import type { PlayerIndexEntry } from "@/lib/data/loadMatch";

function MatchCard({
  match,
  playerTeam,
  onClick,
}: {
  match: MatchSummary;
  playerTeam?: string;
  onClick: () => void;
}) {
  const totalGoals = match.homeScore + match.awayScore;
  const excitement =
    totalGoals >= 6 ? "🔥" : totalGoals >= 4 ? "⚡" : "";

  return (
    <button
      onClick={onClick}
      data-testid={`match-card-${match.matchId}`}
      style={{
        width: "100%",
        textAlign: "left",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: "20px 22px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        fontFamily: "Inter, sans-serif",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(255,255,255,0.05)";
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          "rgba(74,222,128,0.25)";
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(255,255,255,0.025)";
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
      }}
    >
      {/* Competition + date */}
      <div
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: playerTeam ? 6 : 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span>{match.competition} · {match.date}</span>
        {playerTeam && (
          <span
            style={{
              fontSize: 9,
              padding: "2px 7px",
              borderRadius: 4,
              background: "rgba(74,222,128,0.12)",
              color: "#4ade80",
              border: "1px solid rgba(74,222,128,0.2)",
              textTransform: "none",
              letterSpacing: "0.03em",
              fontWeight: 500,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {playerTeam}
          </span>
        )}
      </div>

      {/* Score row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#4ade80",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {match.homeTeam}
        </span>
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.03em",
            margin: "0 12px",
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {match.homeScore}–{match.awayScore}
          {excitement && (
            <span style={{ fontSize: 14, marginLeft: 4 }}>{excitement}</span>
          )}
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#60a5fa",
            flex: 1,
            textAlign: "right",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {match.awayTeam}
        </span>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 11,
          color: "rgba(255,255,255,0.35)",
        }}
      >
        <span>
          xG{" "}
          <span style={{ color: "#4ade80" }}>{match.homeXg.toFixed(2)}</span>
          {" – "}
          <span style={{ color: "#60a5fa" }}>{match.awayXg.toFixed(2)}</span>
        </span>
        <span>
          Shots{" "}
          <span style={{ color: "rgba(255,255,255,0.55)" }}>
            {match.homeShots ?? 0}–{match.awayShots ?? 0}
          </span>
        </span>
      </div>
    </button>
  );
}

export default function MatchExplorer() {
  const [, setLocation] = useLocation();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [competition, setCompetition] = useState("");
  const [team, setTeam] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerIndexEntry | null>(null);

  useEffect(() => {
    loadMatchIndex()
      .then(setMatches)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const competitions = useMemo(() => getUniqueCompetitions(matches), [matches]);
  const teams = useMemo(() => getUniqueTeams(matches), [matches]);

  const filtered = useMemo(() => {
    let results = filterMatches(matches, {
      competition: competition || undefined,
      team: team || undefined,
      search: search || undefined,
    });

    if (selectedPlayer) {
      const ids = new Set(selectedPlayer.matchIds.map(String));
      results = results.filter((m) => ids.has(String(m.matchId)));
    }

    // Newest first
    return [...results].sort((a, b) => b.date.localeCompare(a.date));
  }, [matches, competition, team, search, selectedPlayer]);

  const hasFilters = !!(search || competition || team || selectedPlayer);

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
    outline: "none",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
    colorScheme: "dark",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <header
        className="rsp-header"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "20px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#4ade80",
              boxShadow: "0 0 8px #4ade80",
            }}
          />
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            Tactical Lens
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => setLocation("/compare")}
            style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.08)", color: "#a78bfa", fontSize: 12, cursor: "pointer", fontFamily: "Inter,sans-serif" }}
          >
            Compare Players ↔
          </button>
          <div className="rsp-hide-mobile" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>
            StatsBomb · Understat
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="rsp-hero" style={{ padding: "48px 40px 32px", maxWidth: 1000, margin: "0 auto" }}>
        <h1
          className="rsp-hero-title"
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.03em",
            marginBottom: 8,
          }}
        >
          Match Explorer
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>
          Watch the match like an analyst, not a fan.
        </p>

        {/* Filters — row 1: team search + competition + team dropdowns */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <input
            type="search"
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, flex: "1 1 200px" }}
            data-testid="search-input"
          />
          <select
            value={competition}
            onChange={(e) => setCompetition(e.target.value)}
            style={{ ...selectStyle, flex: "1 1 180px" }}
            data-testid="filter-competition"
          >
            <option value="">All Competitions</option>
            {competitions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            style={{ ...selectStyle, flex: "1 1 180px" }}
            data-testid="filter-team"
          >
            <option value="">All Teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Filters — row 2: player search + clear */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <PlayerSearch selected={selectedPlayer} onSelect={setSelectedPlayer} />
          {hasFilters && (
            <button
              onClick={() => {
                setSearch("");
                setCompetition("");
                setTeam("");
                setSelectedPlayer(null);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "rgba(255,255,255,0.5)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                flexShrink: 0,
              }}
              data-testid="clear-filters"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Match grid */}
      <main className="rsp-main" style={{ maxWidth: 1000, margin: "0 auto", padding: "0 40px 60px" }}>
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: 60,
              color: "rgba(255,255,255,0.3)",
              fontSize: 14,
            }}
          >
            Loading matches...
          </div>
        )}
        {error && (
          <div
            style={{
              textAlign: "center",
              padding: 60,
              color: "#f87171",
              fontSize: 14,
            }}
          >
            Error: {error}
          </div>
        )}
        {!loading && !error && (
          <>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.25)",
                marginBottom: 16,
                letterSpacing: "0.04em",
              }}
            >
              {filtered.length} MATCH{filtered.length !== 1 ? "ES" : ""}
              {selectedPlayer && (
                <span style={{ color: "rgba(74,222,128,0.5)", marginLeft: 8 }}>
                  featuring {selectedPlayer.name}
                </span>
              )}
            </div>
            <div
              className="rsp-grid-cards"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 12,
              }}
            >
              {filtered.map((match) => {
                const playerTeam = selectedPlayer
                  ? selectedPlayer.teams.find(
                      (t) => t === match.homeTeam || t === match.awayTeam
                    )
                  : undefined;
                return (
                  <MatchCard
                    key={match.matchId}
                    match={match}
                    playerTeam={playerTeam}
                    onClick={() => setLocation(`/match/${match.matchId}`)}
                  />
                );
              })}
            </div>
            {filtered.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: 60,
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 14,
                }}
              >
                No matches found.{" "}
                {selectedPlayer
                  ? `${selectedPlayer.name} doesn't appear in any matches with these filters.`
                  : "Try clearing filters."}
              </div>
            )}
          </>
        )}
      </main>

      {/* Attribution */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "20px 40px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
          Data:{" "}
          <a href="https://github.com/statsbomb/open-data" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(74,222,128,0.6)", textDecoration: "none" }}>StatsBomb Open Data</a>
          {" "}·{" "}
          <a href="https://understat.com" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(74,222,128,0.6)", textDecoration: "none" }}>Understat</a>
        </p>
      </footer>
    </div>
  );
}
