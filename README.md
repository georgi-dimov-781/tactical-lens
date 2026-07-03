# Tactical Lens

> *"Watch the match like an analyst, not a fan."*

A dark, premium football analytics platform that transforms raw StatsBomb event data into tactical match stories — goal build-ups, xG timelines, pitch maps, and player insights, all in one place.

---

## Features

### Match Explorer
Browse 180+ real matches from StatsBomb Open Data and Understat. Filter by competition, team, or search for a specific player to see every match they appeared in.

### Interactive Pitch Map
A live SVG football pitch with five switchable event layers:
- **Shots** — dots scaled by xG value, colored by outcome (goal / saved / blocked / off target)
- **Passes** — arrows with solid lines for complete, dashed for incomplete, gold for key passes
- **Carries** — directional runs colored by team
- **Pressures** — defensive pressure zones
- **Ball Recoveries** — where teams win the ball back

Filters for team, player, and half. Every filter state is reflected in the URL so views are shareable.

### xG Timeline
A cumulative expected goals chart across 90 minutes for both teams, with vertical markers at each goal and hover tooltips showing shot details at any point in the match.

### Goal Build-up Stories
Select any goal from a dropdown to see the full sequence of events in the 45 seconds before it — displayed as a timestamped event list alongside a pitch overlay showing the build-up path.

### Key Moments Timeline
A chronological narrative of the match's decisive events — goals, key passes, big saves — in a clean scannable format.

### Player Profiles
Individual player pages with match logs, xG per match charts, and shot distribution maps across all matches in the dataset.

### Player Comparison
Head-to-head comparison of any two players: goals, xG, shots, conversion rate, key passes, and a cumulative xG race chart.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript |
| Routing | Wouter |
| Styling | Tailwind CSS v4 |
| UI primitives | shadcn/ui + Radix UI |
| Visualizations | visx (React + D3) |
| State management | Zustand |
| Data validation | Zod |
| Data sources | StatsBomb Open Data · Understat |

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Install and run

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5000`. Match data is already preprocessed and included in `public/data/` — no scripts need to run before you start.

### Build for production

```bash
npm run build
```

Output goes to `dist/public/`.

---

## Data Pipeline

Raw StatsBomb event files are 3–10 MB each and too large to serve directly. The scripts in `scripts/` preprocess them into lean, frontend-ready JSON:

```
StatsBomb Open Data (GitHub)
        ↓
scripts/import-statsbomb.mjs      ← fetch competitions, matches, events, lineups
        ↓
scripts/preprocess.mjs            ← clean, normalize, extract needed fields
        ↓
scripts/fetch-understat.mjs       ← supplement with Understat match data
        ↓
scripts/backfill-key-moments.mjs  ← generate key moments narratives
        ↓
scripts/build-players-index.mjs   ← create player search index
        ↓
public/data/                      ← static JSON, served directly
```

Each match gets its own directory under `public/data/matches/{matchId}/` with separate files for shots, passes, carries, xG timeline, lineups, build-ups, and key moments.

---

## Project Structure

```
tactical-lens/
├── src/
│   ├── pages/
│   │   ├── MatchExplorer.tsx      ← Home / match grid
│   │   ├── MatchPage.tsx          ← Full match dashboard
│   │   ├── PlayerPage.tsx         ← Player profile
│   │   └── ComparePage.tsx        ← Side-by-side player comparison
│   │
│   ├── components/
│   │   ├── pitch/                 ← FootballPitch, ShotLayer, PassLayer, CarryLayer…
│   │   ├── charts/                ← XgTimeline
│   │   └── match/                 ← MatchHeader, MatchStats, Lineups, GoalBuildUp…
│   │
│   ├── lib/
│   │   ├── data/                  ← Data loaders (loadMatch, matchIndex)
│   │   ├── football/              ← Coordinate mapping, build-up logic
│   │   └── types/                 ← TypeScript types for events, matches, players
│   │
│   └── store/
│       └── matchStore.ts          ← Zustand store for match page state
│
├── scripts/                       ← Data pipeline scripts
├── public/data/                   ← Preprocessed static JSON (180+ matches)
├── wrangler.jsonc                 ← Cloudflare static-assets + SPA routing config
├── vercel.json                    ← Vercel SPA routing config
└── index.html
```

---

## Deployment

The app is a static SPA — it deploys to any static host with one build command and zero server configuration.

### Cloudflare (Workers Static Assets)

Connect your GitHub repo under **Workers & Pages → Create**. The build runs `npm run build`, and `wrangler.jsonc` at the repo root tells Cloudflare to serve `dist/public` as static assets with SPA routing (`not_found_handling: single-page-application`). `.node-version` pins the build image to Node 20. No environment variables or extra setup are needed — every push to `main` auto-deploys.

### Netlify

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Publish directory | `dist/public` |

Add a `public/_redirects` file containing `/*  /index.html  200` so client-side routes resolve.

### Vercel

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist/public` |

The `vercel.json` at the repo root handles client-side routing on Vercel.

---

## URL State

The match page reflects filter state in the URL, making every view shareable:

```
/match/3788741?view=shots&team=France&player=Kylian+Mbappé&period=1
```

Parameters: `view` (shots / passes / carries / pressures / recoveries), `team`, `player`, `period` (1 or 2).

---

## Data Attribution

Match event data is provided by **StatsBomb Open Data**, free for use in public analytics projects.

> StatsBomb would like to thank you for your continued use of their free data. As a condition of use, we ask that you credit StatsBomb and display the StatsBomb logo when publishing any analysis or visualizations created using this data. See the [StatsBomb Open Data repository](https://github.com/statsbomb/open-data) for full license terms.

Additional match data sourced from [Understat](https://understat.com).

---

## v2 Roadmap

Features planned after the MVP is stable:

- Pass network graph
- Progressive passes layer
- Heatmaps (tactical zone grid)
- Possession chain ranking
- Player comparison — shot map overlay
- Auto tactical summary per match
- Pitch animations (event replay)
- Export as PNG
- StatsBomb 360 freeze-frame visualizations
