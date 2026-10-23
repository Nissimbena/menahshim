import type { ScheduleGame } from "../schedule/schedule";
import { TEAMS, teamName } from "../schedule/teams";
import { t, tDynamic } from "../i18n/i18n";
import { screenHeader, emptyState } from "../ui/ScreenHeader";
import { el, esc, shortDate, ltr } from "../ui/dom";

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
    const header = screenHeader({ title: team ? teamName(team) : "", onBack: () => this.onBack(this.sportId, this.leagueId) });
    return header;
  }

  /** Compact game row, same pattern as the home schedule (read-only here). */
  private buildGameCard(game: ScheduleGame): HTMLElement {
    const home = TEAMS[game.homeTeamId];
    const away = TEAMS[game.awayTeamId];
    const row = el("div", "list-row game-row game-row--static");
    const logo = (tm: typeof home) =>
      tm ? `<img src="${tm.logo}" alt="" width="28" height="28" loading="lazy" />` : "";
    row.innerHTML = `
      <span class="game-row__date">
        <span class="num">${shortDate(game.date)}</span>
        <span class="game-row__time num">${game.time ?? t("home.row.tbd")}</span>
      </span>
      <span class="list-row__main">
        <span class="game-row__teams">
          <span class="game-row__side">${logo(home)}<span dir="auto">${esc(home ? teamName(home) : "")}</span></span>
          <span class="game-row__side">${logo(away)}<span dir="auto">${esc(away ? teamName(away) : "")}</span></span>
        </span>
        <span class="list-row__meta" dir="auto">${esc(tDynamic(game.competition))}</span>
      </span>
      <span class="list-row__end">${
        game.result
          ? `<span class="game-row__result num">${ltr(`${game.result.home}–${game.result.away}`)}</span>`
          : ""
      }</span>
    `;
    return row;
  }

  private render() {
    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "screen";
    wrapper.appendChild(this.renderHeader());

    const teamGames = this.games.filter(
      (g) => g.homeTeamId === this.teamId || g.awayTeamId === this.teamId,
    );
    const upcomingGames = teamGames.filter((g) => !g.result);
    const finishedGames = teamGames.filter((g) => g.result);

    if (teamGames.length === 0) {
      wrapper.appendChild(emptyState(t("sportsHub.teamPage.noGames")));
      this.container.appendChild(wrapper);
      return;
    }

    const section = el("div", "home-schedule");

    const tabs = el("div", "tabs home-schedule__tabs");
    tabs.setAttribute("role", "group");
    const tabDefs: ["upcoming" | "finished", string, number][] = [
      ["upcoming", t("home.tab.upcomingShort"), upcomingGames.length],
      ["finished", t("home.tab.finishedShort"), finishedGames.length],
    ];
    tabDefs.forEach(([id, label, n]) => {
      const b = el("button", "tabs__btn", `<span>${label}</span><span class="tabs__count">${n}</span>`);
      b.type = "button";
      b.setAttribute("aria-pressed", String(this.activeTab === id));
      b.addEventListener("click", () => {
        this.activeTab = id;
        this.render();
      });
      tabs.appendChild(b);
    });
    section.appendChild(tabs);

    const list = el("div", "list schedule-list");
    const gamesToShow =
      this.activeTab === "upcoming"
        ? upcomingGames
        : finishedGames.slice().reverse();
    gamesToShow.forEach((game) => list.appendChild(this.buildGameCard(game)));
    section.appendChild(list);

    wrapper.appendChild(section);
    this.container.appendChild(wrapper);
  }
}
