export type TeamSide = "home" | "away";

export type MatchEvent = {
  id: string;
  index: number;
  period: number;
  minute: number;
  second: number;
  timestamp: string;
  team: string;
  player?: string;
  type: "Pass" | "Shot" | "Carry" | "Pressure" | "Ball Recovery" | string;
  location?: [number, number];
  endLocation?: [number, number];
  outcome?: string;
  xg?: number;
  possession?: number;
};

export type ShotEvent = MatchEvent & {
  type: "Shot";
  xg: number;
  bodyPart?: string;
  technique?: string;
  result: "Goal" | "Saved" | "Blocked" | "Off T" | string;
};

export type PassEvent = MatchEvent & {
  type: "Pass";
  recipient?: string;
  length?: number;
  angle?: number;
  height?: string;
  isKeyPass?: boolean;
  assistedShotId?: string;
};

export type XgPoint = {
  minute: number;
  team: string;
  cumulativeXg: number;
  shotXg: number;
  player: string;
  outcome: string;
};

export type GoalBuildUp = {
  goalEventId: string;
  goalMinute: number;
  scorer: string;
  team: string;
  events: MatchEvent[];
};
