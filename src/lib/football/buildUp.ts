import type { MatchEvent } from "../types";

export function getGoalBuildUp(
  events: MatchEvent[],
  goalEvent: MatchEvent,
  windowSeconds = 45
): MatchEvent[] {
  const goalTime = goalEvent.minute * 60 + goalEvent.second;

  return events.filter((event) => {
    const eventTime = event.minute * 60 + event.second;
    return eventTime >= goalTime - windowSeconds && eventTime <= goalTime;
  });
}

export function getGoalEvents(events: MatchEvent[]): MatchEvent[] {
  return events.filter(
    (e) => e.type === "Shot" && e.outcome === "Goal"
  );
}
