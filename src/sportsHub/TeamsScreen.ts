import "./sportsHub.css";
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
    header.className = "sh-header";
    header.innerHTML = `
      <button type="button" class="sh-back-btn">&rarr; ${t("common.back")}</button>
      <div class="sh-header-title sh-display" dir="auto">${title}</div>
      <div style="width:70px;"></div>
    `;
    header
      .querySelector(".sh-back-btn")
      ?.addEventListener("click", () => this.onBack(this.sportId));
    return header;
  }

  private render() {
    const league = leagueById(this.sportId, this.leagueId);

    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "sports-hub-screen";

    const bgGrid = document.createElement("div");
    bgGrid.className = "sh-cyber-grid";
    wrapper.appendChild(bgGrid);

    wrapper.appendChild(this.renderHeader(t("sportsHub.teams.title")));

    const content = document.createElement("div");
    content.className = "sh-content";

    if (!league?.competitionId) {
      const p = document.createElement("p");
      p.className = "sh-empty-text";
      p.textContent = t("sportsHub.leagues.none");
      content.appendChild(p);
      wrapper.appendChild(content);
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
      p.className = "sh-empty-text";
      p.textContent = t("sportsHub.teams.none");
      content.appendChild(p);
      wrapper.appendChild(content);
      this.container.appendChild(wrapper);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "sh-team-grid";
    teams.forEach((team) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "sh-hologram-card sh-team-card";
      card.innerHTML = `
        <img class="sh-card-logo" src="${team.logo}" alt="${teamName(team)}" />
        <span class="sh-card-name" dir="auto">${teamName(team)}</span>
      `;
      card.addEventListener("click", () =>
        this.onSelectTeam(team.id, this.sportId, this.leagueId),
      );
      grid.appendChild(card);
    });
    content.appendChild(grid);
    wrapper.appendChild(content);

    this.container.appendChild(wrapper);
  }
}
