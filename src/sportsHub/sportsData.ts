/**
 * Static catalog for the new multi-sport "drill down" hub: sport -> league
 * -> team -> team page. Only Basketball's Israeli top division is wired to
 * real data for now (derived from the existing `games` schedule via
 * `competitionId`); everything else is listed but marked "coming soon" so
 * the navigation shell is ready to grow into without being functional yet.
 */

export interface SportCategory {
  id: string;
  nameHe: string;
  nameEn: string;
  icon: string;
  enabled: boolean;
}

export const SPORTS: SportCategory[] = [
  { id: "basketball", nameHe: "כדורסל", nameEn: "Basketball", icon: "🏀", enabled: true },
  { id: "football", nameHe: "כדורגל", nameEn: "Football", icon: "⚽", enabled: false },
  { id: "rugby", nameHe: "רוגבי", nameEn: "Rugby", icon: "🏉", enabled: false },
  { id: "handball", nameHe: "כדוריד", nameEn: "Handball", icon: "🤾", enabled: false },
  { id: "volleyball", nameHe: "כדורעף", nameEn: "Volleyball", icon: "🏐", enabled: false },
  { id: "tennis", nameHe: "טניס", nameEn: "Tennis", icon: "🎾", enabled: false },
];

export interface SportLeague {
  id: string;
  nameHe: string;
  nameEn: string;
  enabled: boolean;
  /** Ties this league to real data: teams are derived from games whose competitionId matches this. */
  competitionId?: number;
}

export const LEAGUES_BY_SPORT: Record<string, SportLeague[]> = {
  basketball: [
    {
      id: "winner-league",
      nameHe: 'ליגת "Winner" סל (גברים)',
      nameEn: "Winner League (Men)",
      enabled: true,
      competitionId: 1,
    },
    {
      id: "eurocup",
      nameHe: "BKT EuroCup",
      nameEn: "BKT EuroCup",
      enabled: false,
    },
    {
      id: "winner-cup",
      nameHe: 'גביע "Winner"',
      nameEn: "Winner Cup",
      enabled: false,
    },
  ],
};

export function sportById(id: string): SportCategory | undefined {
  return SPORTS.find((s) => s.id === id);
}

export function leagueById(
  sportId: string,
  leagueId: string,
): SportLeague | undefined {
  return (LEAGUES_BY_SPORT[sportId] ?? []).find((l) => l.id === leagueId);
}
