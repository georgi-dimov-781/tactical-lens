export type PlayerPosition = {
  position: string;
  positionId: number;
};

export type Player = {
  id: number;
  name: string;
  jerseyNumber?: number;
  country?: string;
  position?: string;
};

export type Lineup = {
  teamId: number;
  teamName: string;
  players: Player[];
};
