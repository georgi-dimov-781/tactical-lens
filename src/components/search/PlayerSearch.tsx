import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { loadPlayersIndex, type PlayerIndexEntry } from "@/lib/data/loadMatch";

interface PlayerSearchProps {
  onSelect: (player: PlayerIndexEntry | null) => void;
  selected: PlayerIndexEntry | null;
}

export function PlayerSearch({ onSelect, selected }: PlayerSearchProps) {
  const [, setLocation] = useLocation();
  const [players, setPlayers] = useState<PlayerIndexEntry[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    loadPlayersIndex().then(setPlayers).catch(() => {});
  }, []);

  const suggestions = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return players
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 12);
  }, [query, players]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || !suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[highlighted]) pick(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function pick(player: PlayerIndexEntry) {
    onSelect(player);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function clear() {
    onSelect(null);
    setQuery("");
    setOpen(false);
  }

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
    outline: "none",
    width: "100%",
  };

  return (
    <div style={{ position: "relative", flex: "1 1 200px" }}>
      {selected ? (
        /* Selected pill */
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 12px",
            borderRadius: 8,
            border: "1px solid rgba(74,222,128,0.35)",
            background: "rgba(74,222,128,0.08)",
            fontSize: 13,
            color: "#4ade80",
            fontFamily: "Inter, sans-serif",
            cursor: "default",
          }}
        >
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected.name}
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>
            {selected.matchIds.length} match{selected.matchIds.length !== 1 ? "es" : ""}
          </span>
          <button
            onClick={() => setLocation(`/player/${selected.id}`)}
            title="View player profile"
            style={{
              background: "none",
              border: "none",
              color: "rgba(74,222,128,0.7)",
              cursor: "pointer",
              fontSize: 12,
              lineHeight: 1,
              padding: "0 4px",
              flexShrink: 0,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Profile →
          </button>
          <button
            onClick={clear}
            aria-label="Clear player filter"
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              fontSize: 14,
              lineHeight: 1,
              padding: 0,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      ) : (
        /* Search input */
        <input
          ref={inputRef}
          type="search"
          placeholder="Search players…"
          value={query}
          autoComplete="off"
          onFocus={() => { if (suggestions.length) setOpen(true); }}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          style={inputStyle}
          data-testid="player-search-input"
        />
      )}

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 100,
            margin: 0,
            padding: "4px 0",
            listStyle: "none",
            background: "#13131f",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {suggestions.map((player, i) => (
            <li
              key={player.id}
              onMouseDown={() => pick(player)}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: "9px 14px",
                cursor: "pointer",
                background: i === highlighted ? "rgba(74,222,128,0.08)" : "transparent",
                borderLeft: i === highlighted ? "2px solid #4ade80" : "2px solid transparent",
                transition: "background 0.1s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 13,
                    color: i === highlighted ? "#4ade80" : "rgba(255,255,255,0.85)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {player.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    flexShrink: 0,
                  }}
                >
                  {player.teams.join(" / ")}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.35)",
                    flexShrink: 0,
                  }}
                >
                  {player.matchIds.length}g
                </span>
              </div>
              {player.country && (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
                  {player.country}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
