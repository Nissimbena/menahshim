import type { ScheduleGame } from "../schedule/schedule";
import { TEAMS, teamName } from "../schedule/teams";
import { leagueById } from "./sportsData";
import { t } from "../i18n/i18n";

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
    const header = document.createElement("div");
    header.className = "prediction-header";
    header.innerHTML = `
      <button class="btn-back" type="button">&rarr; ${t("common.back")}</button>
      <div class="prediction-title"><h1 dir="auto">${title}</h1></div>
      <div class="prediction-header-spacer"></div>
    `;
    header
      .querySelector(".btn-back")
      ?.addEventListener("click", () => this.onBack(this.sportId));
    return header;
  }

  private render() {
    const league = leagueById(this.sportId, this.leagueId);

    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "leaderboard-wrapper";
    wrapper.appendChild(this.renderHeader(t("sportsHub.teams.title")));

    if (!league?.competitionId) {
      const p = document.createElement("p");
      p.className = "counter-text";
      p.textContent = t("sportsHub.leagues.none");
      wrapper.appendChild(p);
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
      const p = document.createElement("p");
      p.className = "counter-text";
      p.textContent = t("sportsHub.teams.none");
      wrapper.appendChild(p);
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
        <img class="sport-card-logo" src="${team.logo}" alt="${teamName(team)}" />
        <span class="sport-card-name" dir="auto">${teamName(team)}</span>
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
