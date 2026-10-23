import type { ScheduleGame } from "../schedule/schedule";
import { TEAMS, teamName } from "../schedule/teams";
import { leagueById } from "./sportsData";
import { t } from "../i18n/i18n";
import { screenHeader, emptyState } from "../ui/ScreenHeader";

/** Step 3 of the drill-down: every team that appears in the chosen league's games. */
export class TeamsScreen {
  private container: HTMLElement;
  private games: ScheduleGame[];
  private onBack: (sportId: string) => void;
  private onSelectTeam: (teamId: string, sportId: string, leagueId: string) => void;
  private sportId = "";
  private leagueId = "";

  constructor(
    container: HTMLElement,
    games: ScheduleGame[],
    onBack: (sportId: string) => void,
    onSelectTeam: (teamId: string, sportId: string, leagueId: string) => void,
  ) {
    this.container = container;
    this.games = games;
    this.onBack = onBack;
    this.onSelectTeam = onSelectTeam;

    window.addEventListener("langchange", () => {
      if (!this.container.classList.contains("hidden")) this.render();
    });
  }

  setGames(games: ScheduleGame[]) {
    this.games = games;
  }

  show(sportId: string, leagueId: string) {
    this.sportId = sportId;
    this.leagueId = leagueId;
    this.container.classList.remove("hidden");
    this.render();
  }

  hide() {
    this.container.classList.add("hidden");
  }

  private renderHeader(title: string): HTMLElement {
    const header = screenHeader({ title: title, onBack: () => this.onBack(this.sportId) });
    return header;
  }

  private render() {
    const league = leagueById(this.sportId, this.leagueId);

    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "screen";
    wrapper.appendChild(this.renderHeader(t("sportsHub.teams.title")));

    if (!league?.competitionId) {
      wrapper.appendChild(emptyState(t("sportsHub.leagues.none")));
      this.container.appendChild(wrapper);
      return;
    }

    const teamIds = new Set<string>();
    this.games
      .filter((g) => g.competitionId === league.competitionId)
      .forEach((g) => {
        teamIds.add(g.homeTeamId);
        teamIds.add(g.awayTeamId);
      });

    const teams = [...teamIds]
      .map((id) => TEAMS[id])
      .filter((team): team is NonNullable<typeof team> => !!team)
      .sort((a, b) => teamName(a).localeCompare(teamName(b)));

    if (teams.length === 0) {
      wrapper.appendChild(emptyState(t("sportsHub.teams.none")));
      this.container.appendChild(wrapper);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "sports-grid";
    teams.forEach((team) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "sport-card";
      card.innerHTML = `
        <img class="sport-card__logo" src="${team.logo}" alt="" width="56" height="56" loading="lazy" />
        <span class="sport-card__name" dir="auto">${teamName(team)}</span>
      `;
      card.addEventListener("click", () =>
        this.onSelectTeam(team.id, this.sportId, this.leagueId),
      );
      grid.appendChild(card);
    });
    wrapper.appendChild(grid);

    this.container.appendChild(wrapper);
  }
}
