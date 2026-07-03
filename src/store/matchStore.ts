import { create } from "zustand";
import type { MatchEvent, ShotEvent, PassEvent, XgPoint, GoalBuildUp } from "../lib/types";
import type { Lineup } from "../lib/types/player";

export type EventLayer = "passes" | "shots" | "carries" | "pressures" | "recoveries";

interface MatchState {
  events: MatchEvent[];
  shots: ShotEvent[];
  passes: PassEvent[];
  carries: MatchEvent[];
  pressures: MatchEvent[];
  recoveries: MatchEvent[];
  xgTimeline: XgPoint[];
  lineups: Lineup[];
  buildUps: GoalBuildUp[];

  activeLayer: EventLayer;
  filterTeam: string | null;
  filterPlayer: string | null;
  filterPeriod: number | null;

  setEvents: (events: MatchEvent[]) => void;
  setShots: (shots: ShotEvent[]) => void;
  setPasses: (passes: PassEvent[]) => void;
  setCarries: (carries: MatchEvent[]) => void;
  setPressures: (pressures: MatchEvent[]) => void;
  setRecoveries: (recoveries: MatchEvent[]) => void;
  setXgTimeline: (timeline: XgPoint[]) => void;
  setLineups: (lineups: Lineup[]) => void;
  setBuildUps: (buildUps: GoalBuildUp[]) => void;

  setActiveLayer: (layer: EventLayer) => void;
  setFilterTeam: (team: string | null) => void;
  setFilterPlayer: (player: string | null) => void;
  setFilterPeriod: (period: number | null) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  events: [],
  shots: [],
  passes: [],
  carries: [],
  pressures: [],
  recoveries: [],
  xgTimeline: [],
  lineups: [],
  buildUps: [],

  activeLayer: "shots",
  filterTeam: null,
  filterPlayer: null,
  filterPeriod: null,

  setEvents: (events) => set({ events }),
  setShots: (shots) => set({ shots }),
  setPasses: (passes) => set({ passes }),
  setCarries: (carries) => set({ carries }),
  setPressures: (pressures) => set({ pressures }),
  setRecoveries: (recoveries) => set({ recoveries }),
  setXgTimeline: (xgTimeline) => set({ xgTimeline }),
  setLineups: (lineups) => set({ lineups }),
  setBuildUps: (buildUps) => set({ buildUps }),

  setActiveLayer: (activeLayer) => set({ activeLayer }),
  setFilterTeam: (filterTeam) => set({ filterTeam }),
  setFilterPlayer: (filterPlayer) => set({ filterPlayer }),
  setFilterPeriod: (filterPeriod) => set({ filterPeriod }),
}));
