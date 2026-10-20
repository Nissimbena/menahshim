// Position labels as used on hapoel.co.il/team.
export type Position = "רכז" | "גארד" | "פורוורד" | "פורוורד-סנטר" | "סנטר";

export interface Player {
  id: string;
  name: string;
  position: Position;
  jerseyNumber: number;
  citizenship: string;
  /** True if not eligible under the "Israeli" domestic roster quota. */
  isForeign: boolean;
  photoUrl: string | null;
  height: number | null;
  birthDate: string | null; // DD/MM/YYYY
}

/**
 * A user's prediction for one game:
 *  - (domestic competitions only) which foreign players will be registered
 *    to play - Israeli players are always eligible, so only foreign slots
 *    are limited and worth guessing.
 *  - who will lead the team in points/rebounds/assists, and by how much.
 *  - the final score.
 */
export interface GamePrediction {
  predictedForeignPlayerIds: string[];
  topScorerPlayerId: string | null;
  topScorerPoints: number | null;
  topRebounderPlayerId: string | null;
  topRebounds: number | null;
  topAssistPlayerId: string | null;
  topAssists: number | null;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  /** Team-level guesses: how many threes/rebounds/assists the team will total. */
  predictedTeamThrees: number | null;
  predictedTeamRebounds: number | null;
  predictedTeamAssists: number | null;
  /** Answer to a one-off yes/no bonus question, only asked for specific games - see BONUS_QUESTIONS. */
  predictedBonusAnswer: boolean | null;
}

export const EMPTY_PREDICTION: GamePrediction = {
  predictedForeignPlayerIds: [],
  topScorerPlayerId: null,
  topScorerPoints: null,
  topRebounderPlayerId: null,
  topRebounds: null,
  topAssistPlayerId: null,
  topAssists: null,
  predictedHomeScore: null,
  predictedAwayScore: null,
  predictedTeamThrees: null,
  predictedTeamRebounds: null,
  predictedTeamAssists: null,
  predictedBonusAnswer: null,
};

/** The real outcome of a game, entered by the admin, used to grade predictions. */
export interface GameResult {
  gameId: string;
  actualForeignPlayerIds: string[];
  actualTopScorerPlayerId: string | null;
  actualTopScorerPoints: number | null;
  actualTopRebounderPlayerId: string | null;
  actualTopRebounds: number | null;
  actualTopAssistPlayerId: string | null;
  actualTopAssists: number | null;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  actualTeamThrees: number | null;
  actualTeamRebounds: number | null;
  actualTeamAssists: number | null;
  actualBonusAnswer: boolean | null;
}

/** BKT EuroCup has no foreign-player registration limit, unlike domestic competitions. */
export const EUROPE_COMPETITION_ID = 2;
