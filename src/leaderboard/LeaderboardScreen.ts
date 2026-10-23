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
import { auth } from "../firebase/firebase";
import { screenHeader, skeleton, emptyState } from "../ui/ScreenHeader";
import { rankList } from "../ui/RankList";
import { el } from "../ui/dom";

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
    return screenHeader({ title: this.titleText, onBack: () => this.onBack() });
  }

  private page(): HTMLElement {
    this.container.innerHTML = "";
    const page = el("div", "screen leaderboard");
    page.appendChild(this.renderHeader());
    this.container.appendChild(page);
    return page;
  }

  private renderLoading() {
    const page = this.page();
    page.appendChild(skeleton("list", 8));
  }

  private renderError() {
    this.page().appendChild(emptyState(t("leaderboard.error"), "error"));
  }

  private render() {
    const page = this.page();

    if (this.overallRows.length === 0) {
      page.appendChild(emptyState(t("leaderboard.empty")));
      return;
    }

    if (this.lastGameRows.length > 0) {
      if (this.activeTab !== "lastGame" && this.activeTab !== "overall")
        this.activeTab = "lastGame";
      page.appendChild(this.renderTabs());
    } else {
      page.appendChild(this.renderTable(this.overallRows));
    }
  }

  private renderTabs(): HTMLElement {
    const tabsWrapper = el("div", "leaderboard-tabs");

    const seg = el("div", "tabs");
    seg.setAttribute("role", "group");
    const tabs: ["lastGame" | "overall", string][] = [
      ["lastGame", t("leaderboard.tab.byGame")],
      ["overall", t("leaderboard.overall")],
    ];
    tabs.forEach(([id, label]) => {
      const b = el("button", "tabs__btn");
      b.type = "button";
      b.textContent = label;
      b.setAttribute("aria-pressed", String(this.activeTab === id));
      b.addEventListener("click", () => {
        if (this.activeTab === id) return;
        this.activeTab = id;
        this.render();
      });
      seg.appendChild(b);
    });
    tabsWrapper.appendChild(seg);

    const content = el("div", "leaderboard-tab-content");
    if (this.activeTab === "lastGame") {
      const picker = this.renderPastGamePicker();
      if (picker) content.appendChild(picker);
      else content.appendChild(el("p", "overline leaderboard-game-title", this.lastGameTitle));
      content.appendChild(this.renderPastGameTable());
    } else {
      content.appendChild(this.renderTable(this.overallRows));
    }
    tabsWrapper.appendChild(content);

    return tabsWrapper;
  }

  /** Dropdown to pick any past (already-graded) game to view its own per-game ranking, instead of only the most recent one. */
  private renderPastGamePicker(): HTMLElement | null {
    const gradedGames = this.games
      .filter((g) => g.result)
      .sort((a, b) => this.parseDdMmYyyy(b.date) - this.parseDdMmYyyy(a.date));
    if (gradedGames.length === 0) return null;

    const wrap = el("div", "leaderboard-game-picker");

    const label = el("label", "field-label");
    label.textContent = t("leaderboard.selectPastGame");
    label.htmlFor = "leaderboard-game-select";
    wrap.appendChild(label);

    const select = el("select", "field leaderboard-game-select");
    select.id = "leaderboard-game-select";
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
    wrap.appendChild(el("p", "leaderboard-hint c-3 t-small", t("leaderboard.tapHint")));

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
      return skeleton("list", 6);
    }
    const rows =
      gameId === this.lastGameId
        ? this.lastGameRows
        : (gameId && this.pastGameRowsCache.get(gameId)) || [];
    if (rows.length === 0) return emptyState(t("leaderboard.empty"));
    return this.renderTable(rows, gameId ?? undefined);
  }

  private renderTable(rows: LeaderboardRow[], gameIdForClick?: string): HTMLElement {
    const section = el("div", "leaderboard-table-section");
    section.appendChild(
      rankList(rows, {
        meUid: auth.currentUser?.uid,
        onRowClick: gameIdForClick
          ? (row) => this.userPredictionModal.show(gameIdForClick, row.uid, row.name)
          : undefined,
      }),
    );
    return section;
  }
}
