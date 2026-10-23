export interface ScheduleGame {
  id: string;
  date: string; // DD/MM/YYYY
  time: string | null; // null = not yet announced ("לא סופי")
  competition: string;
  competitionId: number | null;
  homeTeamId: string;
  awayTeamId: string;
  result?: { home: number; away: number };
}

/**
 * The season schedule (local league + BKT EuroCup) lives in the `games`
 * table in Cloud SQL, not here - see HapoelJerusalemBackend's `GET /games`
 * endpoint and `seed_games.py` (re-run that script to add/edit games, or
 * edit rows directly in Cloud SQL Studio). Fetch it at runtime via
 * `getGames()` in `../api/backend`.
 */

/**
 * Game ids where correctly predicting that game earns a shot at a physical
 * prize, handed out live at whichever home/arena game comes next. Maps each
 * game id to a short description of that specific prize, shown on the game
 * card and in the badge tooltip (see the "how scoring works" page for the
 * full explanation).
 */
export const PRIZE_GAME_IDS = new Map<string, string>([
  ["ec-1", "פרס פיזי מיוחד"],
  ["wc-sf-maccabi", "כרטיס לגמר גביע הוינר"],
  ["ec-3", "זוג כרטיסים לפסטיבל הקומדיה הישראלי"],
]);

/** Game ids whose prize pairs with an external sponsor link (e.g. a festival site) - shown as an extra CTA button on the game card. */
export const PRIZE_LINK_URLS = new Map<string, string>([
  ["ec-3", "https://comedy-festival.co.il/"],
]);

/**
 * A one-off yes/no bonus question asked for specific games only, shown on
 * the team-stats prediction step. Worth its own fixed point value, graded
 * separately from the regular scoring rules.
 */
export interface BonusQuestion {
  question: string;
  points: number;
}

export const BONUS_QUESTIONS = new Map<string, BonusQuestion>([
  ["ec-2", { question: "האם לורנזו בראון ישחק מעל 10 דקות?", points: 10 }],
  ["26647", { question: "האם רועי הובר יקלע לפחות שלשלה אחת?", points: 10 }],
  ["ec-3", { question: "האם נקלע מעל 72% מהקו?", points: 10 }],
  [
    "26653",
    {
      question:
        "האם יהיו לנו 2 שחקנים או יותר עם 4 עבירות אישיות או יותר כל אחד?",
      points: 10,
    },
  ],
  ["ec-4", { question: "האם רועי הובר ישחק מעל 3 דקות?", points: 10 }],
]);

/**
 * Special one-off tournament scoring only the next 6 games (same scoring
 * rules as always) - winner gets a pair of VIP tickets to the Eilat game.
 */
export const KIPA_ADUMA_100_GAME_IDS = [
  "26647",
  "ec-3",
  "26653",
  "ec-4",
  "26662",
  "ec-5",
];

/** Opponent team ids for those 6 games, in schedule order - used to show logos on the tournament screen. */
export const KIPA_ADUMA_100_OPPONENT_IDS = [
  "holon",
  "burgos",
  "beersheva",
  "riga",
  "telaviv-hapoel",
  "lemans",
];

export const KIPA_ADUMA_100_PRIZE =
  "זוג כרטיסי VIP למשחק הפועל ירושלים מול הפועל אילת";
