/**
 * Full box scores for finished games (Hapoel Jerusalem players).
 *
 * The results API carries the team totals and the three stat leaders; the
 * per-player lines below are optional and, when present, the finished game
 * page shows a full box-score table. Key = the game's id; playerId = the id
 * from the players table. Shooting is "made-attempted", e.g. "6-11".
 *
 * Example:
 *   "26647": {
 *     players: [
 *       { playerId: "p5", min: "31", pts: 24, reb: 4, ast: 3, stl: 1, blk: 0, tov: 2, fg: "8-15", three: "4-8", ft: "4-4" },
 *       ...
 *     ],
 *   },
 */
export interface BoxScoreLine {
  playerId: string;
  /** Minutes, e.g. "31" or "31:12". Leave out for DNP. */
  min?: string;
  pts: number;
  reb: number;
  ast: number;
  stl?: number;
  blk?: number;
  tov?: number;
  fg?: string;
  three?: string;
  ft?: string;
}

export interface GameBoxScore {
  players: BoxScoreLine[];
}

export const GAME_BOX_SCORES: Record<string, GameBoxScore> = {};

export function boxScoreForGame(gameId: string): GameBoxScore | null {
  return GAME_BOX_SCORES[gameId] ?? null;
}
