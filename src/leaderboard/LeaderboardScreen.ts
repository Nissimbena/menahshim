import {
  getLeaderboard,
  getLeaderboardForGame,
  getLeagueLeaderboard,
  type LeaderboardRow,
} from "../api/backend";
import type { ScheduleGame } from "../schedule/schedule";
import { TEAMS, HAPOEL_JERUSALEM_TEAM_ID, teamName } from "../schedule/teams";
import { UserPredictionModal } from "./UserPredictionModal";
import { t } from "../i18n/i18n";

export class LeaderboardScreen {
  private container: HTMLElement;
  private onBack: () => void;
  private games: ScheduleGame[];
  private titleText = "";
  private lastGameTitle = "";
  private activeTab: "lastGame" | "overall" = "lastGame";
  private overallRows: LeaderboardRow[] = [];
  private lastGameRows: LeaderboardRow[] = [];
  private lastGameId: string | null = null;
  private selectedPastGameId: string | null = null;
  private pastGameRowsCache = new Map<string, LeaderboardRow[]>();
  private userPredictionModal = new UserPredictionModal();

  constructor(
    container: HTMLElement,
    onBack: () => void,
    games: ScheduleGame[] = [],
  ) {
    this.container = container;
    this.onBack = onBack;
    this.games = games;
  }

  setGames(games: ScheduleGame[]) {
    this.games = games;
  }

  /** Builds "ניקוד המשחק האחרון - נגד מכבי תל אביב" from the matching game, if found. */
  private resolveLastGameTitle(lastGameId: string | null): string {
    const base = t("leaderboard.lastGameTitle");
    const game = lastGameId
      ? this.games.find((g) => g.id === lastGameId)
      : null;
    if (!game) return base;
    const opponentId =
      game.homeTeamId === HAPOEL_JERUSALEM_TEAM_ID
        ? game.awayTeamId
        : game.homeTeamId;
    const opponent = TEAMS[opponentId];
    return opponent
      ? `${base} - ${t("home.game.vs")} ${teamName(opponent)}`
      : base;
  }

  /** "17/10/2026 - נגד הפועל באר שבע" - used as each past-game dropdown option's label. */
  private gameOptionLabel(game: ScheduleGame): string {
    const opponentId =
      game.homeTeamId === HAPOEL_JERUSALEM_TEAM_ID
        ? game.awayTeamId
        : game.homeTeamId;
    const opponent = TEAMS[opponentId];
    return opponent
      ? `${game.date} - ${t("home.game.vs")} ${teamName(opponent)}`
      : game.date;
  }

  private parseDdMmYyyy(date: string): number {
    const [d, m, y] = date.split("/").map(Number);
    return new Date(y, m - 1, d).getTime();
  }

  async show() {
    this.titleText = t("leaderboard.title");
    this.activeTab = "lastGame";
    this.selectedPastGameId = null;
    this.pastGameRowsCache.clear();
    this.container.classList.remove("hidden");
    this.renderLoading();
    try {
      const { overall, lastGame, lastGameId } = await getLeaderboard();
      this.overallRows = overall;
      this.lastGameRows = lastGame;
      this.lastGameId = lastGameId;
      this.lastGameTitle = this.resolveLastGameTitle(lastGameId);
      this.render();
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      this.renderError();
    }
  }

  async showLeague(leagueId: string) {
    this.container.classList.remove("hidden");
    this.renderLoading();
    try {
      const { name, overall } = await getLeagueLeaderboard(leagueId);
      this.titleText = t("home.menu.leagueTable", { name });
      this.overallRows = overall;
      this.lastGameRows = [];
      this.lastGameId = null;
      this.render();
    } catch (err) {
      console.error("Failed to load league leaderboard:", err);
      this.renderError();
    }
  }

  hide() {
    this.container.classList.add("hidden");
  }

  private renderHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className = "prediction-header";
    header.innerHTML = `
      <button class="btn-back" type="button">&rarr; ${t("common.back")}</button>
      <div class="prediction-title"><h1>${this.titleText}</h1></div>
      <div class="prediction-header-spacer"></div>
    `;
    header
      .querySelector(".btn-back")
      ?.addEventListener("click", () => this.onBack());
    return header;
  }

  private renderLoading() {
    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "leaderboard-wrapper";
    wrapper.appendChild(this.renderHeader());
    const p = document.createElement("p");
    p.className = "counter-text";
    p.textContent = t("leaderboard.loading");
    wrapper.appendChild(p);
    this.container.appendChild(wrapper);
  }

  private renderError() {
    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "leaderboard-wrapper";
    wrapper.appendChild(this.renderHeader());
    const p = document.createElement("p");
    p.className = "counter-text";
    p.textContent = t("leaderboard.error");
    wrapper.appendChild(p);
    this.container.appendChild(wrapper);
  }

  private render() {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "leaderboard-wrapper";
    wrapper.appendChild(this.renderHeader());

    if (this.overallRows.length === 0) {
      const empty = document.createElement("p");
      empty.className = "counter-text";
      empty.textContent = t("leaderboard.empty");
      wrapper.appendChild(empty);
      this.container.appendChild(wrapper);
      return;
    }

    if (this.lastGameRows.length > 0) {
      if (this.activeTab !== "lastGame" && this.activeTab !== "overall")
        this.activeTab = "lastGame";
      wrapper.appendChild(this.renderTabs());
    } else {
      wrapper.appendChild(
        this.renderTable(t("leaderboard.overall"), this.overallRows),
      );
    }

    this.container.appendChild(wrapper);
  }

  private renderTabs(): HTMLElement {
    const tabsWrapper = document.createElement("div");
    tabsWrapper.className = "leaderboard-tabs-wrapper";

    const tabsBar = document.createElement("div");
    tabsBar.className = "leaderboard-tabs";

    const lastGameTab = document.createElement("button");
    lastGameTab.type = "button";
    lastGameTab.className =
      "leaderboard-tab" + (this.activeTab === "lastGame" ? " active" : "");
    lastGameTab.textContent = this.lastGameTitle;

    const overallTab = document.createElement("button");
    overallTab.type = "button";
    overallTab.className =
      "leaderboard-tab" + (this.activeTab === "overall" ? " active" : "");
    overallTab.textContent = t("leaderboard.overall");

    const content = document.createElement("div");
    content.className = "leaderboard-tab-content";
    if (this.activeTab === "lastGame") {
      const picker = this.renderPastGamePicker();
      if (picker) content.appendChild(picker);
      content.appendChild(this.renderPastGameTable());
    } else {
      content.appendChild(
        this.renderTable(t("leaderboard.overall"), this.overallRows, true),
      );
    }

    lastGameTab.addEventListener("click", () => {
      if (this.activeTab === "lastGame") return;
      this.activeTab = "lastGame";
      this.render();
    });
    overallTab.addEventListener("click", () => {
      if (this.activeTab === "overall") return;
      this.activeTab = "overall";
      this.render();
    });

    tabsBar.appendChild(lastGameTab);
    tabsBar.appendChild(overallTab);
    tabsWrapper.appendChild(tabsBar);
    tabsWrapper.appendChild(content);

    return tabsWrapper;
  }

  /** Dropdown to pick any past (already-graded) game to view its own per-game ranking, instead of only the most recent one. */
  private renderPastGamePicker(): HTMLElement | null {
    const gradedGames = this.games
      .filter((g) => g.result)
      .sort((a, b) => this.parseDdMmYyyy(b.date) - this.parseDdMmYyyy(a.date));
    if (gradedGames.length === 0) return null;

    const wrap = document.createElement("div");
    wrap.className = "leaderboard-game-picker";

    const label = document.createElement("label");
    label.className = "counter-text";
    label.textContent = t("leaderboard.selectPastGame");
    wrap.appendChild(label);

    const select = document.createElement("select");
    select.className = "leaderboard-game-select";
    gradedGames.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = this.gameOptionLabel(g);
      select.appendChild(opt);
    });
    select.value = this.selectedPastGameId ?? this.lastGameId ?? "";
    select.addEventListener("change", () => {
      this.selectedPastGameId = select.value;
      this.loadAndRenderPastGame(select.value);
    });
    wrap.appendChild(select);

    return wrap;
  }

  private async loadAndRenderPastGame(gameId: string) {
    if (gameId === this.lastGameId || this.pastGameRowsCache.has(gameId)) {
      this.render();
      return;
    }
    this.render();
    try {
      const rows = await getLeaderboardForGame(gameId);
      this.pastGameRowsCache.set(gameId, rows);
    } catch (err) {
      console.error("Failed to load past game leaderboard:", err);
      this.pastGameRowsCache.set(gameId, []);
    }
    this.render();
  }

  private renderPastGameTable(): HTMLElement {
    const gameId = this.selectedPastGameId ?? this.lastGameId;
    if (
      gameId &&
      gameId !== this.lastGameId &&
      !this.pastGameRowsCache.has(gameId)
    ) {
      const p = document.createElement("p");
      p.className = "counter-text";
      p.textContent = t("leaderboard.loading");
      return p;
    }
    const rows =
      gameId === this.lastGameId
        ? this.lastGameRows
        : (gameId && this.pastGameRowsCache.get(gameId)) || [];
    return this.renderTable(
      this.lastGameTitle,
      rows,
      true,
      gameId ?? undefined,
    );
  }

  private renderTable(
    title: string,
    rows: LeaderboardRow[],
    hideTitle = false,
    gameIdForClick?: string,
  ): HTMLElement {
    const section = document.createElement("div");
    section.className = "leaderboard-table-section";

    if (!hideTitle) {
      const heading = document.createElement("h2");
      heading.textContent = title;
      section.appendChild(heading);
    }

    const table = document.createElement("div");
    table.className = "leaderboard-table";
    rows.forEach((row, i) => {
      const rowEl = document.createElement("div");
      rowEl.className = "leaderboard-row" + (i === 0 ? " leader" : "");
      rowEl.innerHTML = `
        <span class="leaderboard-rank">#${i + 1}</span>
        <span class="leaderboard-name${gameIdForClick ? " clickable" : ""}" dir="auto">${row.name}</span>
        <span class="leaderboard-score">${row.total}</span>
      `;
      if (gameIdForClick) {
        rowEl
          .querySelector(".leaderboard-name")
          ?.addEventListener("click", () =>
            this.userPredictionModal.show(gameIdForClick, row.uid, row.name),
          );
      }
      table.appendChild(rowEl);
    });
    section.appendChild(table);

    return section;
  }
}
