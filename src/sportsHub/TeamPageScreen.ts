import "./sportsHub.css";
import type { ScheduleGame } from "../schedule/schedule";
import { TEAMS, teamName } from "../schedule/teams";
import { t, tDynamic } from "../i18n/i18n";

/** Step 4 of the drill-down: a read-only schedule for one team (no predictions yet). */
export class TeamPageScreen {
  private container: HTMLElement;
  private games: ScheduleGame[];
  private onBack: (sportId: string, leagueId: string) => void;
  private teamId = "";
  private sportId = "";
  private leagueId = "";
  private activeTab: "upcoming" | "finished" = "upcoming";

  constructor(
    container: HTMLElement,
    games: ScheduleGame[],
    onBack: (sportId: string, leagueId: string) => void,
  ) {
    this.container = container;
    this.games = games;
    this.onBack = onBack;

    window.addEventListener("langchange", () => {
      if (!this.container.classList.contains("hidden")) this.render();
    });
  }

  setGames(games: ScheduleGame[]) {
    this.games = games;
  }

  show(teamId: string, sportId: string, leagueId: string) {
    this.teamId = teamId;
    this.sportId = sportId;
    this.leagueId = leagueId;
    this.activeTab = "upcoming";
    this.container.classList.remove("hidden");
    this.render();
  }

  hide() {
    this.container.classList.add("hidden");
  }

  private renderHeader(): HTMLElement {
    const team = TEAMS[this.teamId];
    const header = document.createElement("div");
    header.className = "sh-header";
    header.innerHTML = `
      <button type="button" class="sh-back-btn">&rarr; ${t("common.back")}</button>
      <div class="sh-header-title sh-display" dir="auto">${team ? teamName(team) : ""}</div>
      <div style="width:70px;"></div>
    `;
    header
      .querySelector(".sh-back-btn")
      ?.addEventListener("click", () => this.onBack(this.sportId, this.leagueId));
    return header;
  }

  private buildGameCard(game: ScheduleGame): HTMLElement {
    const home = TEAMS[game.homeTeamId];
    const away = TEAMS[game.awayTeamId];

    const card = document.createElement("div");
    card.className = "sh-hologram-card sh-game-card";

    const meta = document.createElement("div");
    meta.className = "sh-game-meta";
    meta.innerHTML = `
      <span>${tDynamic(game.competition)}</span>
      <span>${game.date}${game.time ? ` &middot; ${game.time}` : ` &middot; ${t("home.game.timeTBD")}`}</span>
    `;
    card.appendChild(meta);

    const matchup = document.createElement("div");
    matchup.className = "sh-game-matchup";
    matchup.innerHTML = `
      <div class="sh-game-team">
          ${home ? `<img src="${home.logo}" alt="${teamName(home)}" />` : ""}
          <span dir="auto">${home ? teamName(home) : ""}</span>
      </div>
      <span class="sh-game-vs">${t("home.game.vs")}</span>
      <div class="sh-game-team">
          ${away ? `<img src="${away.logo}" alt="${teamName(away)}" />` : ""}
          <span dir="auto">${away ? teamName(away) : ""}</span>
      </div>
    `;
    card.appendChild(matchup);

    if (game.result) {
      const resultEl = document.createElement("div");
      resultEl.className = "sh-game-result";
      resultEl.textContent = `${game.result.home} - ${game.result.away}`;
      card.appendChild(resultEl);
    }

    return card;
  }

  private render() {
    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "sports-hub-screen";

    const bgGrid = document.createElement("div");
    bgGrid.className = "sh-cyber-grid";
    wrapper.appendChild(bgGrid);

    wrapper.appendChild(this.renderHeader());

    const content = document.createElement("div");
    content.className = "sh-content";

    const teamGames = this.games.filter(
      (g) => g.homeTeamId === this.teamId || g.awayTeamId === this.teamId,
    );
    const upcomingGames = teamGames.filter((g) => !g.result);
    const finishedGames = teamGames.filter((g) => g.result);

    if (teamGames.length === 0) {
      const p = document.createElement("p");
      p.className = "sh-empty-text";
      p.textContent = t("sportsHub.teamPage.noGames");
      content.appendChild(p);
      wrapper.appendChild(content);
      this.container.appendChild(wrapper);
      return;
    }

    const tabs = document.createElement("div");
    tabs.className = "sh-tabs";

    const upcomingTab = document.createElement("button");
    upcomingTab.type = "button";
    upcomingTab.className =
      "sh-tab" + (this.activeTab === "upcoming" ? " active" : "");
    upcomingTab.textContent = t("home.tab.upcoming", {
      n: upcomingGames.length,
    });
    upcomingTab.addEventListener("click", () => {
      this.activeTab = "upcoming";
      this.render();
    });
    tabs.appendChild(upcomingTab);

    const finishedTab = document.createElement("button");
    finishedTab.type = "button";
    finishedTab.className =
      "sh-tab" + (this.activeTab === "finished" ? " active" : "");
    finishedTab.textContent = t("home.tab.finished", {
      n: finishedGames.length,
    });
    finishedTab.addEventListener("click", () => {
      this.activeTab = "finished";
      this.render();
    });
    tabs.appendChild(finishedTab);
    content.appendChild(tabs);

    const gamesToShow =
      this.activeTab === "upcoming"
        ? upcomingGames
        : finishedGames.slice().reverse();
    gamesToShow.forEach((game) => content.appendChild(this.buildGameCard(game)));

    wrapper.appendChild(content);
    this.container.appendChild(wrapper);
  }
}
