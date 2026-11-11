import type { ScheduleGame } from "../schedule/schedule";
import { getActiveGameId } from "../prediction/lock";

/**
 * A sponsored prize for one game - shown as a prize "ticket" on that game's
 * hero card and as a "playing for" line while predicting it. The winner is
 * whoever scores the most points for that game (see scoring.prize rules).
 *
 * Which game: `gameId` if set, else the game on `gameDate` (DD/MM/YYYY, as
 * in the schedule), else the next open game when the site loads.
 * Turn it off with `enabled: false`.
 */
export interface SponsorPrize {
  enabled: boolean;
  gameId?: string;
  gameDate?: string;
  /** The prize itself, he/en (one line, used in running text). */
  prize: { he: string; en: string };
  /** The prize as a headline: the name, then a short second line. */
  headline: { title: { he: string; en: string }; note: { he: string; en: string } };
  /** Sponsor name, he/en. */
  sponsor: { he: string; en: string };
  /** Optional photo of the prize (e.g. the sponsor's product shot), under
   *  /public - transparent PNG/WebP works best. Without it a drawn jersey shows. */
  image?: string;
  /** Sponsor logo, under /public. */
  logo: string;
  /** Link to the prize in the sponsor's store. */
  url: string;
  /** Key for click tracking (trackLinkEvent). */
  trackKey: string;
}

export const SPONSOR_PRIZE: SponsorPrize = {
  enabled: true,
  prize: { he: "גופיית NBA לבחירה", en: "NBA jersey of your choice" },
  headline: {
    title: { he: "גופיית NBA", en: "NBA jersey" },
    note: { he: "לבחירתכם, מכל הקבוצות", en: "your pick, any team" },
  },
  image: "partners/prize-jersey.webp",
  sponsor: { he: "פוטבול ישראל", en: "Futebol IL" },
  logo: "partners/futebol-il.webp",
  url: "https://futebol-il.com/nba/%D7%92%D7%95%D7%A4%D7%99%D7%95%D7%AA-nba",
  trackKey: "prize_futebol_nba",
};

let prizeGameId: string | null = null;

/** Called once the schedule is loaded (main.ts), to pin the prize to its game. */
export function registerSponsorPrize(games: ScheduleGame[]): void {
  const p = SPONSOR_PRIZE;
  if (!p.enabled) return void (prizeGameId = null);
  prizeGameId =
    p.gameId ??
    (p.gameDate ? games.find((g) => g.date === p.gameDate)?.id ?? null : getActiveGameId(games));
}

export function sponsorPrizeFor(gameId: string | undefined | null): SponsorPrize | null {
  if (!gameId || !SPONSOR_PRIZE.enabled || gameId !== prizeGameId) return null;
  return SPONSOR_PRIZE;
}
