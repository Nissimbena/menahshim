import { GAME_TITLE } from "../config/GameConfig";
import {
  type ScheduleGame,
  PRIZE_GAME_IDS,
  PRIZE_LINK_URLS,
} from "../schedule/schedule";
import { TEAMS, HAPOEL_JERUSALEM_TEAM_ID, teamName } from "../schedule/teams";
import type { MyPrediction, LeagueInfo } from "../api/backend";
import {
  reportClientError,
  trackLinkEvent,
  getChallengeEligibility,
  type ChallengeEligibility,
} from "../api/backend";
import {
  getActiveGameId,
  isScoreLocked,
  gameDateTime,
  SCORE_LOCK_MS,
} from "../prediction/lock";
import {
  auth,
  isAdmin,
  onAuthChange,
  signInWithGoogle,
  signOutUser,
  type User,
} from "../firebase/firebase";
import { isRunningStandalone } from "../pwa/InstallPrompt";
import { t, tDynamic, getLang, setLang } from "../i18n/i18n";
import { fitText } from "../ui/fitText";

// Temporarily disabled per explicit request (2026-10-14) - hides the feature
// from regular users (no create-challenge button, no "My Challenges" menu
// item) without touching any backend data or the admin panel, which keeps
// managing existing challenges as before. Flip back to true to re-enable.
const CHALLENGE_FEATURE_ENABLED = false;

// The multi-sport hub is local-only for now (explicit request) - keep this
// false in anything that gets deployed; flip to true only for local dev.
const SPORTS_HUB_ENABLED = false;

/** "1 יום 03:24:10" style countdown, or a locked message once time runs out. */
function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return t("common.countdown.locked");
  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  // Isolate the LTR clock digits so they don't get reordered against the Hebrew day-count text.
  const clock = `\u2066${pad(hours)}:${pad(minutes)}:${pad(seconds)}\u2069`;
  const dayWord =
    days === 1 ? t("common.countdown.day") : t("common.countdown.days");
  return days > 0 ? `${days} ${dayWord} ${clock}` : clock;
}

/**
 * Landing page: big Hapoel Jerusalem logo + the season schedule.
 * Every upcoming game (no result yet) can be entered to make a squad prediction.
 */
export class HomeScreen {
  private container: HTMLElement;
  private games: ScheduleGame[];
  private onEnterGame: (game: ScheduleGame) => void;
  private onOpenLeaderboard: () => void;
  private onOpenTournament: () => void;
  private onOpenAdmin: () => void;
  private onOpenScoringInfo: () => void;
  private onOpenTimeKiller: () => void;
  private onCreateLeague: () => void;
  private onOpenLeagueLeaderboard: (league: LeagueInfo) => void;
  private onInstallClick: () => void;
  private onOpenPrivacy: () => void;
  private onOpenAbout: () => void;
  private onChallengeGame: (game: ScheduleGame) => void;
  private onOpenMyChallenges: () => void;
  private onOpenSportsHub: () => void;
  private currentUser: User | null = auth.currentUser;
  private authError: string | null = null;
  private myPredictions = new Map<string, MyPrediction>();
  private myTotalScore = 0;
  private myLeagues: LeagueInfo[] = [];
  private activeTab: "upcoming" | "finished" = "upcoming";
  private menuOpen = false;
  private challengeEligibility: ChallengeEligibility | null = null;
  private challengeEligibilityGameId: string | null = null;

  constructor(
    container: HTMLElement,
    games: ScheduleGame[],
    onEnterGame: (game: ScheduleGame) => void,
    onOpenLeaderboard: () => void,
    onOpenTournament: () => void,
    onOpenAdmin: () => void,
    onOpenScoringInfo: () => void,
    onOpenTimeKiller: () => void,
    onCreateLeague: () => void,
    onOpenLeagueLeaderboard: (league: LeagueInfo) => void,
    onInstallClick: () => void,
    onOpenPrivacy: () => void,
    onOpenAbout: () => void,
    onChallengeGame: (game: ScheduleGame) => void,
    onOpenMyChallenges: () => void,
    onOpenSportsHub: () => void,
  ) {
    this.container = container;
    this.games = games;
    this.onEnterGame = onEnterGame;
    this.onOpenLeaderboard = onOpenLeaderboard;
    this.onOpenTournament = onOpenTournament;
    this.onOpenAdmin = onOpenAdmin;
    this.onOpenScoringInfo = onOpenScoringInfo;
    this.onOpenTimeKiller = onOpenTimeKiller;
    this.onCreateLeague = onCreateLeague;
    this.onOpenLeagueLeaderboard = onOpenLeagueLeaderboard;
    this.onInstallClick = onInstallClick;
    this.onOpenPrivacy = onOpenPrivacy;
    this.onOpenAbout = onOpenAbout;
    this.onChallengeGame = onChallengeGame;
    this.onOpenMyChallenges = onOpenMyChallenges;
    this.onOpenSportsHub = onOpenSportsHub;

    onAuthChange((user) => {
      this.currentUser = user;
      this.refreshChallengeEligibility();
      if (!this.container.classList.contains("hidden")) this.render();
    });

    window.addEventListener("langchange", () => {
      if (!this.container.classList.contains("hidden")) this.render();
    });

    setInterval(() => this.updateCountdowns(), 1000);
  }

  /** Ticks every open game-card's countdown span without a full re-render. */
  private updateCountdowns() {
    if (this.container.classList.contains("hidden")) return;
    this.container
      .querySelectorAll<HTMLElement>(".game-countdown[data-lock-at]")
      .forEach((el) => {
        const lockAt = Number(el.dataset.lockAt);
        el.textContent = formatCountdown(lockAt - Date.now());
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
        if (!this.container.classList.contains("hidden")) this.render();
      })
      .catch((err) =>
        console.warn("Could not load challenge eligibility:", err),
      );
  }

  setMyPredictions(predictions: MyPrediction[]) {
    this.myPredictions = new Map(predictions.map((p) => [p.gameId, p]));
    this.myTotalScore = predictions.reduce((sum, p) => sum + (p.score ?? 0), 0);
    if (!this.container.classList.contains("hidden")) this.render();
  }

  setMyLeagues(leagues: LeagueInfo[]) {
    this.myLeagues = leagues;
    if (!this.container.classList.contains("hidden")) this.render();
  }

  /** Shows a visible error under the sign-in button - used so remote bug reports include the real reason, not just "nothing happened". */
  setAuthError(message: string | null) {
    this.authError = message;
    if (!this.container.classList.contains("hidden")) this.render();
  }

  show() {
    this.container.classList.remove("hidden");
    this.menuOpen = false;
    this.refreshChallengeEligibility();
    this.render();
  }

  hide() {
    this.container.classList.add("hidden");
  }

  private render() {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "home-wrapper";

    const top = document.createElement("div");
    top.className = "home-top";
    top.appendChild(this.renderNav());
    top.appendChild(this.renderHero());
    wrapper.appendChild(top);

    wrapper.appendChild(this.renderTournamentBanner());
    wrapper.appendChild(this.renderSchedule());
    wrapper.appendChild(this.renderFooter());
    wrapper.appendChild(this.renderWhatsappGroupButton());

    this.container.appendChild(wrapper);
    fitText(this.container);
  }

  /** Black bar hanging from the top edge: user on one side, main links in the middle, sign-in/out on the other. */
  private renderNav(): HTMLElement {
    const header = document.createElement("header");
    header.className = "site-nav" + (this.menuOpen ? " menu-open" : "");

    const bar = document.createElement("div");
    bar.className = "site-nav-bar";

    // ---- User / brand (start side) ----
    const userEl = document.createElement("div");
    userEl.className = "nav-user";
    if (this.currentUser) {
      const name =
        this.currentUser.displayName ?? this.currentUser.email ?? "משתמש";
      const avatar = this.currentUser.photoURL
        ? `<img class="nav-avatar" src="${this.currentUser.photoURL}" alt="" referrerpolicy="no-referrer" />`
        : `<span class="nav-avatar nav-avatar-empty" aria-hidden="true"></span>`;
      userEl.innerHTML = `
        ${avatar}
        <span class="nav-user-text">
          <span class="nav-user-name" dir="auto">${name}</span>
          <span class="nav-user-score">${t("home.myScore")}: ${this.myTotalScore}</span>
        </span>
      `;
    } else {
      const jerusalem = TEAMS[HAPOEL_JERUSALEM_TEAM_ID];
      userEl.innerHTML = `
        <img class="nav-avatar nav-brand-logo" src="${jerusalem.logo}" alt="" />
        <span class="nav-user-text"><span class="nav-user-name">${GAME_TITLE}</span></span>
      `;
    }
    bar.appendChild(userEl);

    // ---- Main links (desktop) ----
    const links = document.createElement("nav");
    links.className = "nav-links";
    this.primaryLinks().forEach(({ label, action }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-link";
      btn.textContent = label;
      btn.addEventListener("click", () => this.closeMenuAnd(action));
      links.appendChild(btn);
    });
    bar.appendChild(links);

    // ---- Actions (end side) ----
    const actions = document.createElement("div");
    actions.className = "nav-actions";

    const langBtn = document.createElement("button");
    langBtn.type = "button";
    langBtn.className = "nav-lang";
    langBtn.textContent = t("home.langToggle");
    langBtn.addEventListener("click", () =>
      setLang(getLang() === "he" ? "en" : "he"),
    );
    actions.appendChild(langBtn);

    if (this.currentUser) {
      const signOutBtn = document.createElement("button");
      signOutBtn.type = "button";
      signOutBtn.className = "nav-pill";
      signOutBtn.textContent = t("home.signOut");
      signOutBtn.addEventListener("click", () => signOutUser());
      actions.appendChild(signOutBtn);
    } else {
      const signInBtn = document.createElement("button");
      signInBtn.type = "button";
      signInBtn.className = "nav-pill nav-pill-solid";
      signInBtn.textContent = t("home.signIn");
      signInBtn.addEventListener("click", () => {
        signInWithGoogle().catch((e) => {
          console.error(e);
          const message = t("home.signInError", {
            msg: e instanceof Error ? e.message : String(e),
          });
          reportClientError(message, "HomeScreen:signIn");
          this.setAuthError(message);
        });
      });
      actions.appendChild(signInBtn);
    }

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "nav-burger";
    toggleBtn.setAttribute("aria-expanded", String(this.menuOpen));
    toggleBtn.setAttribute(
      "aria-label",
      this.menuOpen ? t("home.menu.close") : t("home.menu.open"),
    );
    toggleBtn.innerHTML = `<span></span><span></span><span></span>`;
    toggleBtn.addEventListener("click", () => {
      this.menuOpen = !this.menuOpen;
      this.render();
    });
    actions.appendChild(toggleBtn);

    bar.appendChild(actions);
    header.appendChild(bar);

    if (this.menuOpen) header.appendChild(this.renderMenuPanel());

    if (this.authError) {
      const errorEl = document.createElement("p");
      errorEl.className = "auth-error";
      errorEl.dir = "auto";
      errorEl.textContent = this.authError;
      header.appendChild(errorEl);
    }

    return header;
  }

  /** The always-visible links shown inline in the bar on wide screens. */
  private primaryLinks(): { label: string; action: () => void }[] {
    const items = [
      {
        label: t("home.menu.leaderboard"),
        action: () => this.onOpenLeaderboard(),
      },
      {
        label: t("home.menu.scoringInfo"),
        action: () => this.onOpenScoringInfo(),
      },
      {
        label: t("home.menu.timeKiller"),
        action: () => this.onOpenTimeKiller(),
      },
    ];
    if (SPORTS_HUB_ENABLED) {
      items.push({
        label: t("home.menu.sportsWorld"),
        action: () => this.onOpenSportsHub(),
      });
    }
    if (this.currentUser) {
      items.push({
        label: t("home.menu.createLeague"),
        action: () => this.onCreateLeague(),
      });
    }
    return items;
  }

  private renderHero(): HTMLElement {
    const hero = document.createElement("section");
    hero.className = "home-hero";

    const jerusalem = TEAMS[HAPOEL_JERUSALEM_TEAM_ID];
    hero.innerHTML = `
      <h1 class="home-wordmark fit-text" data-fit-max="420"><span>${GAME_TITLE}</span></h1>
      <div class="home-tagline">
        <img class="home-tagline-logo" src="${jerusalem.logo}" alt="${teamName(jerusalem)}" />
        <span class="home-tagline-sep" aria-hidden="true">|</span>
        <span class="home-tagline-text">${t("home.tagline")}</span>
      </div>
    `;
    return hero;
  }

  private renderTournamentBanner(): HTMLElement {
    const band = document.createElement("section");
    band.className = "home-vip-band";

    const desc = this.currentUser
      ? t("home.tournamentDescRules")
      : t("home.tournamentDesc");

    band.innerHTML = `
      <div class="vip-card">
        <h2 class="vip-title fit-text" data-fit-max="170"><span>${t("home.tournamentTitle")}</span></h2>
        <p class="vip-desc fit-text" data-fit-max="76"><span>${desc}</span></p>
        <p class="vip-prize">${t("home.tournamentPrize")}</p>
        <button class="vip-btn" type="button">${t("home.tournamentBtn")}</button>
      </div>
    `;
    band
      .querySelector(".vip-btn")
      ?.addEventListener("click", () => this.onOpenTournament());
    return band;
  }

  private renderFooter(): HTMLElement {
    const footer = document.createElement("footer");
    footer.className = "home-footer";

    const links = document.createElement("div");
    links.className = "home-footer-links";

    const addLink = (label: string, action: () => void) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "home-footer-link";
      btn.textContent = label;
      btn.addEventListener("click", action);
      links.appendChild(btn);
    };

    addLink(t("home.about"), () => this.onOpenAbout());
    addLink(t("home.privacy"), () => this.onOpenPrivacy());
    if (!isRunningStandalone()) {
      addLink(t("home.install"), () => this.onInstallClick());
    }

    footer.appendChild(links);

    const mark = document.createElement("p");
    mark.className = "home-footer-mark";
    mark.textContent = GAME_TITLE;
    footer.appendChild(mark);

    return footer;
  }

  /** Fixed bottom-corner floating invite to the game-discussion WhatsApp group. */
  private renderWhatsappGroupButton(): HTMLElement {
    const link = document.createElement("a");
    link.className = "whatsapp-float-btn";
    link.href = "https://chat.whatsapp.com/FEvheh8S3HZ89MYEFLj1qm";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", t("home.whatsappGroup.label"));
    link.title = t("home.whatsappGroup.label");
    link.innerHTML = `
      <svg viewBox="0 0 448 512" width="26" height="26" fill="currentColor" aria-hidden="true">
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 438.9c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.8-186.6 184.8zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
      </svg>
    `;
    return link;
  }

  /** Runs before navigating away from any menu item, so the panel isn't left open when the user comes back to the home screen. */
  private closeMenuAnd(action: () => void) {
    this.menuOpen = false;
    action();
  }

  /** Drop-down under the bar: every destination (the inline links collapse into it on small screens). */
  private renderMenuPanel(): HTMLElement {
    const nav = document.createElement("div");
    nav.className = "nav-panel";

    const addItem = (
      label: string,
      action: () => void,
      extraClass = "",
    ): HTMLButtonElement => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nav-panel-item" + (extraClass ? ` ${extraClass}` : "");
      btn.dir = "auto";
      btn.textContent = label;
      btn.addEventListener("click", () => this.closeMenuAnd(action));
      nav.appendChild(btn);
      return btn;
    };

    this.primaryLinks().forEach(({ label, action }) =>
      addItem(label, action, "nav-panel-primary"),
    );

    if (this.currentUser) {
      if (CHALLENGE_FEATURE_ENABLED) {
        addItem(t("home.menu.myChallenges"), () => this.onOpenMyChallenges());
      }
      this.myLeagues.forEach((league) => {
        addItem(t("home.menu.leagueTable", { name: league.name }), () =>
          this.onOpenLeagueLeaderboard(league),
        );
      });
    }

    if (isAdmin(this.currentUser)) {
      addItem(t("home.menu.admin"), () => this.onOpenAdmin());
    }

    const sep = document.createElement("hr");
    sep.className = "nav-panel-sep";
    nav.appendChild(sep);

    addItem(t("home.about"), () => this.onOpenAbout(), "nav-panel-minor");
    addItem(t("home.privacy"), () => this.onOpenPrivacy(), "nav-panel-minor");
    if (!isRunningStandalone()) {
      addItem(t("home.install"), () => this.onInstallClick(), "nav-panel-minor");
    }

    return nav;
  }

  private renderSchedule(): HTMLElement {
    const section = document.createElement("section");
    section.className = "home-schedule";

    const heading = document.createElement("h2");
    heading.className = "home-schedule-title fit-text";
    heading.dataset.fitMax = "380";
    const headingText = document.createElement("span");
    headingText.textContent = t("home.schedule.title");
    heading.appendChild(headingText);
    section.appendChild(heading);

    const upcomingGames = this.games.filter((g) => !g.result);
    const finishedGames = this.games.filter((g) => g.result);
    const nextGame = upcomingGames[0];
    const activeGameId = getActiveGameId(this.games);

    const tabs = document.createElement("div");
    tabs.className = "schedule-tabs";
    tabs.setAttribute("role", "tablist");

    const makeTab = (
      tab: "upcoming" | "finished",
      label: string,
    ): HTMLButtonElement => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(this.activeTab === tab));
      btn.className = "schedule-tab" + (this.activeTab === tab ? " active" : "");
      btn.textContent = label;
      btn.addEventListener("click", () => {
        this.activeTab = tab;
        this.render();
      });
      return btn;
    };

    tabs.appendChild(
      makeTab("upcoming", t("home.tab.upcoming", { n: upcomingGames.length })),
    );
    tabs.appendChild(
      makeTab("finished", t("home.tab.finished", { n: finishedGames.length })),
    );
    section.appendChild(tabs);

    const list = document.createElement("div");
    list.className = "schedule-list";

    if (this.activeTab === "upcoming") {
      upcomingGames.forEach((game) => {
        list.appendChild(
          this.buildGameCard(game, game === nextGame, game.id === activeGameId),
        );
      });
    } else {
      finishedGames
        .slice()
        .reverse()
        .forEach((game) => {
          list.appendChild(this.buildGameCard(game, false, false));
        });
    }

    section.appendChild(list);
    return section;
  }

  private buildGameCard(
    game: ScheduleGame,
    isNext: boolean,
    isActive: boolean,
  ): HTMLElement {
    const home = TEAMS[game.homeTeamId];
    const away = TEAMS[game.awayTeamId];

    const card = document.createElement("article");
    card.className =
      "game-card" +
      (isNext ? " next-game" : "") +
      (game.result ? " finished" : "");

    // ---- Badges along the top edge ----
    const prizeDescription = PRIZE_GAME_IDS.get(game.id);
    if (isNext || prizeDescription) {
      const badges = document.createElement("div");
      badges.className = "game-badges";
      if (isNext) {
        const badge = document.createElement("span");
        badge.className = "next-game-badge";
        badge.textContent = t("home.game.nextBadge");
        badges.appendChild(badge);
      }
      if (prizeDescription) {
        const prizeBadge = document.createElement("span");
        prizeBadge.className = "prize-game-badge";
        prizeBadge.title = tDynamic(prizeDescription);
        prizeBadge.textContent = t("home.game.prizeBadge");
        badges.appendChild(prizeBadge);
      }
      card.appendChild(badges);
    }

    // ---- Matchup: name · logo · (score) · logo · name ----
    const homeName = teamName(home);
    const awayName = teamName(away);
    const matchup = document.createElement("div");
    matchup.className = "game-matchup";
    matchup.innerHTML = `
      <div class="game-team game-team-home">
        <span class="game-team-name" dir="auto">${homeName}</span>
        <img class="game-team-logo" src="${home.logo}" alt="${homeName}" />
      </div>
      ${
        game.result
          ? `<div class="game-result" dir="ltr"><span>${game.result.home}</span><span class="game-result-sep">:</span><span>${game.result.away}</span></div>`
          : `<span class="game-vs">${t("home.game.vs")}</span>`
      }
      <div class="game-team game-team-away">
        <img class="game-team-logo" src="${away.logo}" alt="${awayName}" />
        <span class="game-team-name" dir="auto">${awayName}</span>
      </div>
    `;
    card.appendChild(matchup);

    if (prizeDescription) {
      const prizeCaption = document.createElement("p");
      prizeCaption.className = "prize-game-caption";
      prizeCaption.dir = "auto";
      prizeCaption.textContent = t("home.game.prizeLabel", {
        prize: tDynamic(prizeDescription),
      });
      card.appendChild(prizeCaption);
    }

    // ---- Bottom row: competition + countdown · CTA · date/time ----
    const footer = document.createElement("div");
    footer.className = "game-footer";

    const meta = document.createElement("div");
    meta.className = "game-meta";
    const competition = document.createElement("span");
    competition.className = "game-competition";
    competition.dir = "auto";
    competition.textContent = tDynamic(game.competition);
    meta.appendChild(competition);

    if (isNext && !game.result) {
      const lockAt = gameDateTime(game).getTime() - SCORE_LOCK_MS;
      const countdown = document.createElement("span");
      countdown.className = "game-countdown";
      countdown.dataset.lockAt = String(lockAt);
      countdown.textContent = formatCountdown(lockAt - Date.now());
      meta.appendChild(countdown);
    } else if (game.result) {
      const final = document.createElement("span");
      final.className = "game-countdown";
      final.textContent = t("home.game.final");
      meta.appendChild(final);
    }
    footer.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "game-actions";

    const addAction = (
      label: string,
      variant: "primary" | "secondary",
      onClick?: () => void,
    ): HTMLButtonElement => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `game-guess-btn game-guess-btn-${variant}`;
      btn.textContent = label;
      if (onClick) btn.addEventListener("click", onClick);
      else btn.disabled = true;
      actions.appendChild(btn);
      return btn;
    };

    if (game.result) {
      addAction(
        this.myPredictions.has(game.id)
          ? t("home.game.viewMyPrediction")
          : t("home.game.viewAveragePrediction"),
        "secondary",
        () => this.onEnterGame(game),
      );
    } else if (this.myPredictions.has(game.id)) {
      addAction(t("home.game.viewPrediction"), "primary", () =>
        this.onEnterGame(game),
      );
    } else if (isActive) {
      addAction(t("home.game.predict"), "primary", () =>
        this.onEnterGame(game),
      );
    } else {
      addAction(
        isScoreLocked(game)
          ? t("home.game.locked")
          : t("home.game.opensAfterPrevious"),
        "secondary",
      );
    }

    if (!game.result && CHALLENGE_FEATURE_ENABLED && this.currentUser && isActive) {
      const alreadyInChallenge =
        this.challengeEligibilityGameId === game.id &&
        this.challengeEligibility?.alreadyInChallenge;
      if (!alreadyInChallenge) {
        const challengeBtn = addAction(t("challenge.gameBtn"), "secondary", () =>
          this.onChallengeGame(game),
        );
        challengeBtn.classList.add("challenge-game-btn");
      }
    }

    const linkUrl = prizeDescription ? PRIZE_LINK_URLS.get(game.id) : undefined;
    if (linkUrl) {
      const linkBtn = document.createElement("a");
      linkBtn.className = "game-guess-btn game-guess-btn-secondary prize-link-btn";
      linkBtn.href = linkUrl;
      linkBtn.target = "_blank";
      linkBtn.rel = "noopener noreferrer";
      linkBtn.textContent = t("home.game.festivalDetails");
      linkBtn.addEventListener("click", () =>
        trackLinkEvent(`prize_link_${game.id}`),
      );
      actions.appendChild(linkBtn);
    }
    footer.appendChild(actions);

    const when = document.createElement("div");
    when.className = "game-date";
    const time = game.time ?? t("home.game.timeTBD");
    // Isolate each LTR chunk so "20:55 | 25/10/2026" keeps its order in RTL.
    when.innerHTML = `<bdi>${time}</bdi><span class="game-date-sep">|</span><bdi>${game.date}</bdi>`;
    footer.appendChild(when);

    card.appendChild(footer);
    return card;
  }
}
