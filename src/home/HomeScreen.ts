import {
  type ScheduleGame,
  PRIZE_GAME_IDS,
  PRIZE_LINK_URLS,
} from "../schedule/schedule";
import { TEAMS, teamName } from "../schedule/teams";
import type { MyPrediction, LeagueInfo, LeaderboardRow } from "../api/backend";
import {
  trackLinkEvent,
  getChallengeEligibility,
  getLeaderboard,
  type ChallengeEligibility,
} from "../api/backend";
import {
  getActiveGameId,
  isScoreLocked,
  gameDateTime,
  SCORE_LOCK_MS,
} from "../prediction/lock";
import { auth, onAuthChange, type User } from "../firebase/firebase";
import { isRunningStandalone } from "../pwa/InstallPrompt";
import { t, tDynamic, getLang, setLang } from "../i18n/i18n";
import { CHALLENGE_FEATURE_ENABLED, WHATSAPP_GROUP_URL } from "../config/GameConfig";
import { icon } from "../ui/icons";
import { el, esc, opponentOf, shortDate, ltr } from "../ui/dom";
import { rankList } from "../ui/RankList";

export interface HomeActions {
  onEnterGame: (game: ScheduleGame) => void;
  onOpenLeaderboard: () => void;
  onOpenTournament: () => void;
  onOpenLeagues: () => void;
  onInstallClick: () => void;
  onOpenPrivacy: () => void;
  onOpenAbout: () => void;
  onChallengeGame: (game: ScheduleGame) => void;
  onSignIn: () => void;
}

/** Splits the time left until a game locks into day/hour/minute parts. */
function countdownParts(msRemaining: number): { d: string; h: string; m: string } | null {
  if (msRemaining <= 0) return null;
  const totalMinutes = Math.floor(msRemaining / 60000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    d: pad(Math.floor(totalMinutes / 1440)),
    h: pad(Math.floor((totalMinutes % 1440) / 60)),
    m: pad(totalMinutes % 60),
  };
}

/** How long a cached leaderboard snapshot stays fresh on the home screen. */
const LEADERBOARD_TTL_MS = 60 * 1000;

/**
 * Home: the next game as a hero with one clear action, a personal strip,
 * the VIP tournament ticket, the season schedule as compact rows, a
 * leaderboard preview and a quiet footer.
 *
 * Mobile is a single column in that order; from 1024px the personal strip,
 * VIP ticket and leaderboard preview move into a 340px sidebar.
 */
export class HomeScreen {
  private container: HTMLElement;
  private games: ScheduleGame[];
  private actions: HomeActions;
  private currentUser: User | null = auth.currentUser;
  private authError: string | null = null;
  private myPredictions = new Map<string, MyPrediction>();
  private myTotalScore = 0;
  private myLeagues: LeagueInfo[] = [];
  private activeTab: "upcoming" | "finished" = "upcoming";
  private challengeEligibility: ChallengeEligibility | null = null;
  private challengeEligibilityGameId: string | null = null;
  private leaderboard: LeaderboardRow[] | null = null;
  private leaderboardError = false;
  private leaderboardFetchedAt = 0;

  constructor(container: HTMLElement, games: ScheduleGame[], actions: HomeActions) {
    this.container = container;
    this.games = games;
    this.actions = actions;

    onAuthChange((user) => {
      this.currentUser = user;
      this.refreshChallengeEligibility();
      if (this.isVisible()) this.render();
    });

    window.addEventListener("langchange", () => {
      if (this.isVisible()) this.render();
    });

    setInterval(() => this.updateCountdowns(), 1000);
  }

  private isVisible() {
    return !this.container.classList.contains("hidden");
  }

  /** Ticks the hero countdown without a full re-render. */
  private updateCountdowns() {
    if (!this.isVisible()) return;
    this.container
      .querySelectorAll<HTMLElement>(".countdown[data-lock-at]")
      .forEach((box) => {
        const parts = countdownParts(Number(box.dataset.lockAt) - Date.now());
        if (!parts) {
          if (!box.classList.contains("is-locked")) {
            box.classList.add("is-locked");
            box.innerHTML = `${icon("lock")}<span>${t("common.countdown.locked")}</span>`;
          }
          return;
        }
        (["d", "h", "m"] as const).forEach((k) => {
          const cell = box.querySelector<HTMLElement>(`[data-part="${k}"]`);
          if (cell && cell.textContent !== parts[k]) cell.textContent = parts[k];
        });
      });
  }

  /** Refetches whether the signed-in user already has an open challenge for the current active game - call after sign-in and after creating/accepting a challenge. */
  refreshChallengeEligibility() {
    const activeGameId = getActiveGameId(this.games);
    if (!this.currentUser || !activeGameId) {
      this.challengeEligibility = null;
      this.challengeEligibilityGameId = null;
      return;
    }
    this.challengeEligibilityGameId = activeGameId;
    getChallengeEligibility(activeGameId)
      .then((eligibility) => {
        if (this.challengeEligibilityGameId !== activeGameId) return;
        this.challengeEligibility = eligibility;
        if (this.isVisible()) this.render();
      })
      .catch((err) =>
        console.warn("Could not load challenge eligibility:", err),
      );
  }

  setMyPredictions(predictions: MyPrediction[]) {
    this.myPredictions = new Map(predictions.map((p) => [p.gameId, p]));
    this.myTotalScore = predictions.reduce((sum, p) => sum + (p.score ?? 0), 0);
    if (this.isVisible()) this.render();
  }

  get totalScore() {
    return this.myTotalScore;
  }

  setMyLeagues(leagues: LeagueInfo[]) {
    this.myLeagues = leagues;
    if (this.isVisible()) this.render();
  }

  /** Shows a visible error banner - used so remote bug reports include the real reason, not just "nothing happened". */
  setAuthError(message: string | null) {
    this.authError = message;
    if (this.isVisible()) this.render();
  }

  show() {
    this.container.classList.remove("hidden");
    this.refreshChallengeEligibility();
    this.loadLeaderboard();
    this.render();
  }

  hide() {
    this.container.classList.add("hidden");
  }

  private loadLeaderboard() {
    if (this.leaderboard && Date.now() - this.leaderboardFetchedAt < LEADERBOARD_TTL_MS) return;
    getLeaderboard()
      .then(({ overall }) => {
        this.leaderboard = overall;
        this.leaderboardError = false;
        this.leaderboardFetchedAt = Date.now();
        if (this.isVisible()) this.render();
      })
      .catch((err) => {
        console.warn("Could not load leaderboard preview:", err);
        this.leaderboardError = true;
        if (this.isVisible()) this.render();
      });
  }

  // ------------------------------------------------------------------ data

  private get upcomingGames() {
    return this.games.filter((g) => !g.result);
  }

  private get finishedGames() {
    return this.games.filter((g) => g.result);
  }

  /** The game the hero is about: the one open for predictions, else the next upcoming one. */
  private get heroGame(): ScheduleGame | undefined {
    const activeId = getActiveGameId(this.games);
    return this.games.find((g) => g.id === activeId) ?? this.upcomingGames[0];
  }

  private get myRank(): number | null {
    if (!this.currentUser || !this.leaderboard) return null;
    const i = this.leaderboard.findIndex((r) => r.uid === this.currentUser!.uid);
    return i >= 0 ? i + 1 : null;
  }

  // ---------------------------------------------------------------- render

  private render() {
    const scrollY = window.scrollY;
    this.container.innerHTML = "";

    const page = el("div", "screen screen--wide home");

    if (this.authError) {
      const banner = el("div", "banner banner--danger home-banner", `${icon("alert")}<p dir="auto"></p>`);
      banner.setAttribute("role", "alert");
      banner.querySelector("p")!.textContent = this.authError;
      page.appendChild(banner);
    }

    const layout = el("div", "home-layout");
    const main = el("div", "home-main");
    const side = el("aside", "home-side");

    main.appendChild(this.renderHero());
    main.appendChild(this.renderSchedule());

    side.appendChild(this.currentUser ? this.renderPersonalStrip() : this.renderSignInCard());
    side.appendChild(this.renderTournamentTicket());
    side.appendChild(this.renderLeadersPreview());

    layout.append(main, side);
    page.appendChild(layout);
    page.appendChild(this.renderFooter());

    this.container.appendChild(page);
    // Re-renders happen in place (data arriving, tab switches) - keep the reader where they were.
    if (scrollY) window.scrollTo({ top: scrollY });
  }

  // ---- 1. Hero: the next game ----
  private renderHero(): HTMLElement {
    const game = this.heroGame;
    const hero = el("section", "hero card card--lg home-hero");
    hero.setAttribute("aria-labelledby", "hero-overline");

    if (!game) {
      hero.classList.add("hero--empty");
      hero.innerHTML = `
        ${icon("basketball", { size: "lg", className: "c-3" })}
        <h2 class="t-h3">${t("home.hero.empty")}</h2>
        <p class="c-2">${t("home.hero.emptyText")}</p>`;
      return hero;
    }

    const home = TEAMS[game.homeTeamId];
    const away = TEAMS[game.awayTeamId];
    const prize = PRIZE_GAME_IDS.get(game.id);
    const lockAt = gameDateTime(game).getTime() - SCORE_LOCK_MS;
    const parts = countdownParts(lockAt - Date.now());

    const team = (tm: typeof home) =>
      tm
        ? `<div class="hero__team">
             <img class="hero__logo" src="${tm.logo}" alt="" width="64" height="64" />
             <span class="hero__team-name t-h3" dir="auto">${esc(teamName(tm))}</span>
           </div>`
        : `<div class="hero__team"></div>`;

    hero.innerHTML = `
      <div class="hero__top">
        <p class="overline" id="hero-overline" dir="auto">${esc(t("home.hero.overline", { competition: tDynamic(game.competition) }))}</p>
        ${prize ? `<span class="tag tag--gold">${icon("gift")}${t("home.game.prizeBadge")}</span>` : ""}
      </div>
      <div class="hero__matchup">
        ${team(home)}
        <div class="hero__when">
          <span class="hero__date num">${shortDate(game.date)}</span>
          <span class="hero__time num">${game.time ?? t("home.game.timeTBD")}</span>
        </div>
        ${team(away)}
      </div>
      <div class="hero__countdown">
        ${
          parts
            ? `<div class="countdown" data-lock-at="${lockAt}" role="timer" aria-label="${t("home.hero.lockIn")}">
                 ${this.countdownUnit("d", parts.d, t("home.countdown.days"))}
                 <span class="countdown__sep" aria-hidden="true">:</span>
                 ${this.countdownUnit("h", parts.h, t("home.countdown.hours"))}
                 <span class="countdown__sep" aria-hidden="true">:</span>
                 ${this.countdownUnit("m", parts.m, t("home.countdown.minutes"))}
               </div>
               <p class="countdown__caption">${t("home.hero.lockIn")}</p>`
            : `<div class="countdown is-locked">${icon("lock")}<span>${t("common.countdown.locked")}</span></div>`
        }
      </div>
    `;

    hero.appendChild(this.buildHeroCta(game));

    if (prize) {
      const prizeLine = el("p", "hero__prize", `${icon("gift", { size: "sm" })}<span dir="auto"></span>`);
      prizeLine.querySelector("span")!.textContent = t("home.game.prizeLabel", { prize: tDynamic(prize) });
      hero.appendChild(prizeLine);

      const linkUrl = PRIZE_LINK_URLS.get(game.id);
      if (linkUrl) {
        const link = el("a", "btn btn--ghost btn--sm hero__prize-link", `<span>${t("home.game.festivalDetails")}</span>${icon("external", { size: "sm" })}`);
        link.href = linkUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.addEventListener("click", () => trackLinkEvent(`prize_link_${game.id}`));
        hero.appendChild(link);
      }
    }

    if (CHALLENGE_FEATURE_ENABLED && this.currentUser && game.id === getActiveGameId(this.games)) {
      const alreadyInChallenge =
        this.challengeEligibilityGameId === game.id &&
        this.challengeEligibility?.alreadyInChallenge;
      if (!alreadyInChallenge) {
        const challengeBtn = el("button", "btn btn--secondary btn--block hero__challenge", `${icon("zap")}<span>${t("challenge.gameBtn")}</span>`);
        challengeBtn.type = "button";
        challengeBtn.addEventListener("click", () => this.actions.onChallengeGame(game));
        hero.appendChild(challengeBtn);
      }
    }

    return hero;
  }

  private countdownUnit(key: string, value: string, label: string): string {
    return `<div class="countdown__unit">
      <span class="countdown__value t-display num" data-part="${key}">${value}</span>
      <span class="countdown__label">${label}</span>
    </div>`;
  }

  /** Same states as the old game card: view/edit, predict, or a locked/not-yet grey button. */
  private buildHeroCta(game: ScheduleGame): HTMLElement {
    const btn = el("button", "btn btn--block hero__cta");
    btn.type = "button";
    const alreadyPredicted = this.myPredictions.has(game.id);
    const isActive = game.id === getActiveGameId(this.games);

    if (alreadyPredicted) {
      btn.classList.add("btn--primary");
      btn.innerHTML = `${icon("check")}<span>${
        isScoreLocked(game) ? t("home.game.viewMyPrediction") : t("home.hero.viewOrEdit")
      }</span>`;
      btn.addEventListener("click", () => this.actions.onEnterGame(game));
    } else if (isActive) {
      btn.classList.add("btn--primary");
      btn.innerHTML = `<span>${t("home.game.predict")}</span>${icon("arrowForward")}`;
      btn.addEventListener("click", () => this.actions.onEnterGame(game));
    } else {
      btn.classList.add("btn--locked");
      btn.disabled = true;
      btn.innerHTML = `${icon("lock")}<span>${
        isScoreLocked(game) ? t("home.game.locked") : t("home.game.opensAfterPrevious")
      }</span>`;
    }
    return btn;
  }

  // ---- 2. Personal strip ----
  private renderPersonalStrip(): HTMLElement {
    const strip = el("section", "card personal-strip");
    strip.setAttribute("aria-label", t("home.strip.label"));
    const rank = this.myRank;
    const cells: [string, string, () => void][] = [
      [String(this.myTotalScore), t("home.strip.score"), () => this.actions.onOpenLeaderboard()],
      [rank !== null ? `#${rank}` : "–", t("home.strip.rank"), () => this.actions.onOpenLeaderboard()],
      [String(this.myLeagues.length), t("home.strip.leagues"), () => this.actions.onOpenLeagues()],
    ];
    cells.forEach(([value, label, fn]) => {
      const b = el("button", "stat personal-strip__cell", `<span class="stat__value">${ltr(value)}</span><span class="stat__label">${label}</span>`);
      b.type = "button";
      b.addEventListener("click", fn);
      strip.appendChild(b);
    });
    return strip;
  }

  private renderSignInCard(): HTMLElement {
    const card = el(
      "section",
      "card signin-card",
      `<div class="signin-card__text">
         <h2 class="t-h3">${t("home.signInCard.title")}</h2>
         <p class="c-2 t-small">${t("home.signInCard.text")}</p>
       </div>`,
    );
    const btn = el("button", "btn btn--secondary btn--block", `${icon("logIn", { className: "icon--dir" })}<span>${t("home.signIn")}</span>`);
    btn.type = "button";
    btn.addEventListener("click", () => this.actions.onSignIn());
    card.appendChild(btn);
    return card;
  }

  // ---- 3. VIP tournament ticket ----
  private renderTournamentTicket(): HTMLElement {
    const ticket = el("section", "ticket");
    const desc = this.currentUser ? t("home.tournamentDescRules") : t("home.tournamentDesc");
    ticket.innerHTML = `
      <div class="ticket__body">
        <span class="tag tag--gold">${icon("ticket")}${t("home.tournamentBadge")}</span>
        <h2 class="t-h3 ticket__title">${t("home.tournamentTitle")}</h2>
        <p class="ticket__desc c-2 t-small">${desc}</p>
      </div>
      <div class="ticket__stub">
        <p class="ticket__prize">${icon("trophy", { size: "sm" })}<span>${t("home.tournamentPrize")}</span></p>
      </div>`;
    const btn = el("button", "btn btn--secondary btn--block btn--sm ticket__btn", `<span>${t("home.tournamentBtn")}</span>${icon("arrowForward", { size: "sm" })}`);
    btn.type = "button";
    btn.addEventListener("click", () => this.actions.onOpenTournament());
    ticket.querySelector(".ticket__stub")!.appendChild(btn);
    return ticket;
  }

  // ---- 4. Season schedule ----
  private renderSchedule(): HTMLElement {
    const section = el("section", "section home-schedule");
    section.setAttribute("aria-labelledby", "schedule-title");
    section.innerHTML = `<div class="section-head"><h2 id="schedule-title">${t("home.schedule.title")}</h2></div>`;

    const upcoming = this.upcomingGames;
    const finished = this.finishedGames;

    const seg = el("div", "segmented home-schedule__tabs");
    seg.setAttribute("role", "group");
    const tabs: ["upcoming" | "finished", string, number][] = [
      ["upcoming", t("home.tab.upcomingShort"), upcoming.length],
      ["finished", t("home.tab.finishedShort"), finished.length],
    ];
    tabs.forEach(([id, label, n]) => {
      const b = el("button", "segmented__btn", `<span>${label}</span><span class="segmented__count">${n}</span>`);
      b.type = "button";
      b.setAttribute("aria-pressed", String(this.activeTab === id));
      b.addEventListener("click", () => {
        if (this.activeTab === id) return;
        this.activeTab = id;
        this.render();
      });
      seg.appendChild(b);
    });
    section.appendChild(seg);

    const list = el("div", "list schedule-list");
    const rows =
      this.activeTab === "upcoming" ? upcoming : finished.slice().reverse();
    const heroId = this.heroGame?.id;
    const activeId = getActiveGameId(this.games);
    rows.forEach((game) => list.appendChild(this.buildGameRow(game, game.id === heroId, game.id === activeId)));
    if (rows.length === 0) {
      list.appendChild(el("p", "list-row c-2", t("home.schedule.empty")));
    }
    section.appendChild(list);
    return section;
  }

  private buildGameRow(game: ScheduleGame, isHero: boolean, isActive: boolean): HTMLElement {
    const { team: opp, isHome } = opponentOf(game);
    const prize = PRIZE_GAME_IDS.get(game.id);
    const predicted = this.myPredictions.has(game.id);
    const enterable = !!game.result || predicted || isActive;

    const row = el("button", `list-row game-row${isHero ? " is-next" : ""}`);
    row.type = "button";
    if (enterable) row.addEventListener("click", () => this.actions.onEnterGame(game));
    else row.disabled = true;

    let end = "";
    if (game.result) {
      const jlm = isHome ? game.result.home : game.result.away;
      const other = isHome ? game.result.away : game.result.home;
      const won = jlm > other;
      end = `<span class="game-row__result num${won ? " is-win" : ""}">${ltr(`${jlm}–${other}`)}</span>
             <span class="game-row__wl ${won ? "is-win" : "is-loss"}">${won ? t("home.row.win") : t("home.row.loss")}</span>
             ${icon("chevronForward", { size: "sm", className: "c-3" })}`;
    } else if (predicted) {
      end = `<span class="tag tag--success">${icon("check")}${t("home.row.predicted")}</span>`;
    } else if (isActive) {
      end = `<span class="btn btn--secondary btn--sm game-row__cta">${t("home.row.predict")}</span>`;
    } else if (isScoreLocked(game)) {
      end = `<span class="tag">${icon("lock")}${t("home.row.locked")}</span>`;
    } else {
      end = `<span class="game-row__later">${t("home.row.later")}</span>`;
    }

    const metaParts = [isHome ? t("home.row.home") : t("home.row.away"), tDynamic(game.competition)];
    row.innerHTML = `
      <span class="game-row__date">
        <span class="num">${shortDate(game.date)}</span>
        <span class="game-row__time num">${game.time ?? t("home.row.tbd")}</span>
      </span>
      <span class="game-row__logo">${opp ? `<img src="${opp.logo}" alt="" width="36" height="36" loading="lazy" />` : ""}</span>
      <span class="list-row__main">
        <span class="list-row__title game-row__opp" dir="auto">
          ${isHero ? `<span class="dot" aria-label="${t("home.game.nextBadge")}"></span>` : ""}
          <span>${esc(opp ? teamName(opp) : "")}</span>
          ${prize ? `<span class="game-row__prize" title="${esc(tDynamic(prize))}">${icon("gift", { size: "sm" })}</span>` : ""}
        </span>
        <span class="list-row__meta" dir="auto">${esc(metaParts.join(" · "))}</span>
      </span>
      <span class="list-row__end">${end}</span>
    `;
    return row;
  }

  // ---- 5. Leaderboard preview ----
  private renderLeadersPreview(): HTMLElement {
    const section = el("section", "home-leaders");
    section.setAttribute("aria-labelledby", "leaders-title");
    section.innerHTML = `<div class="section-head"><h2 id="leaders-title">${t("home.leaders.title")}</h2></div>`;

    if (this.leaderboard === null && !this.leaderboardError) {
      const list = el("div", "list");
      for (let i = 0; i < 5; i++) list.appendChild(el("span", "skeleton skeleton--row"));
      section.appendChild(list);
    } else if (!this.leaderboard || this.leaderboard.length === 0) {
      section.appendChild(el("p", "card c-2 t-small", this.leaderboardError ? t("leaderboard.error") : t("leaderboard.empty")));
    } else {
      section.appendChild(
        rankList(this.leaderboard, {
          meUid: this.currentUser?.uid,
          limit: 5,
          appendMe: true,
          compact: true,
        }),
      );
    }

    const all = el("button", "btn btn--ghost btn--block home-leaders__all", `<span>${t("home.leaders.all")}</span>${icon("arrowForward", { size: "sm" })}`);
    all.type = "button";
    all.addEventListener("click", () => this.actions.onOpenLeaderboard());
    section.appendChild(all);
    return section;
  }

  // ---- 6. Footer ----
  private renderFooter(): HTMLElement {
    const footer = el("footer", "home-footer");

    const wa = el(
      "a",
      "card wa-card",
      `<span class="wa-card__icon">${icon("whatsapp", { size: "lg" })}</span>
       <span class="list-row__main">
         <span class="list-row__title">${t("home.whatsappGroup.title")}</span>
         <span class="list-row__meta">${t("home.whatsappGroup.text")}</span>
       </span>
       ${icon("chevronForward", { className: "c-3" })}`,
    );
    wa.href = WHATSAPP_GROUP_URL;
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
    wa.setAttribute("aria-label", t("home.whatsappGroup.label"));
    footer.appendChild(wa);

    const links = el("nav", "home-footer__links");
    links.setAttribute("aria-label", t("home.footer.label"));
    const add = (label: string, fn: () => void, lang?: string) => {
      const b = el("button", "link-btn");
      b.type = "button";
      b.textContent = label;
      if (lang) b.lang = lang;
      b.addEventListener("click", fn);
      links.appendChild(b);
    };
    add(t("home.about"), () => this.actions.onOpenAbout());
    add(t("home.privacy"), () => this.actions.onOpenPrivacy());
    if (!isRunningStandalone()) add(t("home.installShort"), () => this.actions.onInstallClick());
    const other = getLang() === "he" ? "en" : "he";
    add(t(`lang.${other}`), () => setLang(other), other);
    footer.appendChild(links);
    return footer;
  }
}
