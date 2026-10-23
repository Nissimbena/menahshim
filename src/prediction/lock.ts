import type { ScheduleGame } from "../schedule/schedule";

/** Foreign-player picks lock 24h before tip-off; Israelis are always eligible. */
export const FOREIGN_LOCK_MS = 24 * 60 * 60 * 1000;

/** Final score (and team-leader) picks lock 5 minutes before tip-off. */
export const SCORE_LOCK_MS = 5 * 60 * 1000;

/**
 * Best-effort kickoff timestamp for a game. If the time isn't announced yet
 * ("שעה טרם נקבעה"), midnight of the game date is used as a safe fallback.
 */
export function gameDateTime(game: ScheduleGame): Date {
  const [d, m, y] = game.date.split("/").map(Number);
  const [h, min] = (game.time ?? "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}

export function isForeignLocked(
  game: ScheduleGame,
  now: Date = new Date(),
): boolean {
  return now.getTime() >= gameDateTime(game).getTime() - FOREIGN_LOCK_MS;
}

/** The later of the two locks - once true, every part of the prediction is locked. */
export function isScoreLocked(
  game: ScheduleGame,
  now: Date = new Date(),
): boolean {
  return now.getTime() >= gameDateTime(game).getTime() - SCORE_LOCK_MS;
}

/**
 * Games open for prediction one at a time, in schedule order: a game only
 * becomes enterable once the previous game in the schedule has locked.
 * Returns the id of the single upcoming (no-result-yet) game that's
 * currently open, or null if every upcoming game is still waiting its turn
 * (shouldn't normally happen since the first-ever game has nothing before it).
 */
export function getActiveGameId(
  games: ScheduleGame[],
  now: Date = new Date(),
): string | null {
  const upcoming = games.filter((g) => !g.result);
  const active = upcoming.find((g) => !isScoreLocked(g, now));
  return active ? active.id : null;
}
