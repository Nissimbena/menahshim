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
import { t, tDynamic, getLang, setLang, type Lang } from "../i18n/i18n";

// Temporarily disabled per explicit request (2026-10-14) - hides the feature
// from regular users (no create-challenge button, no "My Challenges" menu
// item) without touching any backend data or the admin panel, which keeps
// managing existing challenges as before. Flip back to true to re-enable.
const CHALLENGE_FEATURE_ENABLED = false;

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

    wrapper.appendChild(this.renderMenu());
    wrapper.appendChild(this.renderLangSwitcher());
    wrapper.appendChild(this.renderWhatsappGroupButton());
    wrapper.appendChild(this.renderTopBar());
    wrapper.appendChild(this.renderHero());
    wrapper.appendChild(this.renderTournamentBanner());
    wrapper.appendChild(this.renderSchedule());

    this.container.appendChild(wrapper);
  }

  private renderTopBar(): HTMLElement {
    const bar = document.createElement("div");
    bar.className = "auth-bar";

    const row = document.createElement("div");
    row.className = "auth-bar-row";

    if (this.currentUser) {
      const userInfo = document.createElement("div");
      userInfo.className = "auth-user";
      userInfo.innerHTML = `
        ${this.currentUser.photoURL ? `<img src="${this.currentUser.photoURL}" alt="" />` : ""}
        <div class="auth-user-info">
          <span dir="auto">${this.currentUser.displayName ?? this.currentUser.email ?? "משתמש"}</span>
          <span class="auth-user-score">${t("home.myScore")}: ${this.myTotalScore}</span>
        </div>
      `;
      row.appendChild(userInfo);

      const signOutBtn = document.createElement("button");
      signOutBtn.type = "button";
      signOutBtn.className = "btn-secondary auth-btn";
      signOutBtn.textContent = t("home.signOut");
      signOutBtn.addEventListener("click", () => signOutUser());
      row.appendChild(signOutBtn);
    } else {
      const signInBtn = document.createElement("button");
      signInBtn.type = "button";
      signInBtn.className = "btn-primary auth-btn";
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
      row.appendChild(signInBtn);
    }

    if (!isRunningStandalone()) {
      const installBtn = document.createElement("button");
      installBtn.type = "button";
      installBtn.className = "btn-secondary install-btn";
      installBtn.textContent = t("home.install");
      installBtn.addEventListener("click", () => this.onInstallClick());
      row.appendChild(installBtn);
    }

    bar.appendChild(row);

    if (this.authError) {
      const errorEl = document.createElement("p");
      errorEl.className = "auth-error";
      errorEl.dir = "auto";
      errorEl.textContent = this.authError;
      bar.appendChild(errorEl);
    }

    const linksRow = document.createElement("div");
    linksRow.className = "footer-links-row";

    const aboutLink = document.createElement("button");
    aboutLink.type = "button";
    aboutLink.className = "privacy-link";
    aboutLink.textContent = t("home.about");
    aboutLink.addEventListener("click", () => this.onOpenAbout());
    linksRow.appendChild(aboutLink);

    const privacyLink = document.createElement("button");
    privacyLink.type = "button";
    privacyLink.className = "privacy-link";
    privacyLink.textContent = t("home.privacy");
    privacyLink.addEventListener("click", () => this.onOpenPrivacy());
    linksRow.appendChild(privacyLink);

    bar.appendChild(linksRow);

    return bar;
  }

  private renderHero(): HTMLElement {
    const hero = document.createElement("div");
    hero.className = "home-hero";

    const jerusalem = TEAMS[HAPOEL_JERUSALEM_TEAM_ID];
    hero.innerHTML = `
      <div class="home-hero-brand">
        <img class="home-logo" src="${jerusalem.logo}" alt="${teamName(jerusalem)}" />
        <span class="home-hero-connector">×</span>
        <span class="home-hero-wordmark">${GAME_TITLE}</span>
      </div>
    `;
    return hero;
  }

  private renderTournamentBanner(): HTMLElement {
    const banner = document.createElement("div");
    banner.className = "tournament-ticket";

    const desc = this.currentUser
      ? t("home.tournamentDescRules")
      : t("home.tournamentDesc");

    banner.innerHTML = `
      <span class="tournament-ticket-badge">${t("home.tournamentBadge")}</span>
      <h2 class="tournament-ticket-title">${t("home.tournamentTitle")}</h2>
      <p class="tournament-ticket-desc">${desc}</p>
      <p class="tournament-ticket-prize">${t("home.tournamentPrize")}</p>
      <button class="tournament-ticket-btn" type="button">${t("home.tournamentBtn")} &larr;</button>
    `;
    banner
      .querySelector(".tournament-ticket-btn")
      ?.addEventListener("click", () => this.onOpenTournament());
    return banner;
  }

  private renderMenu(): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "home-menu-wrap";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "home-menu-toggle";
    toggleBtn.innerHTML = "&#9776;";
    toggleBtn.addEventListener("click", () => {
      this.menuOpen = !this.menuOpen;
      this.render();
    });
    wrap.appendChild(toggleBtn);

    if (this.menuOpen) wrap.appendChild(this.renderMenuPanel());

    return wrap;
  }

  /** Flag toggle (HE/EN) - fixed top-left corner, mirroring the hamburger at top-right. */
  private renderLangSwitcher(): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "lang-switcher";

    const makeFlagBtn = (lang: Lang, flag: string) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "lang-switcher-btn" + (getLang() === lang ? " active" : "");
      btn.textContent = flag;
      btn.addEventListener("click", () => {
        if (getLang() === lang) return;
        setLang(lang);
      });
      return btn;
    };

    wrap.appendChild(makeFlagBtn("he", "🇮🇱"));
    wrap.appendChild(makeFlagBtn("en", "🇺🇸"));

    return wrap;
  }

  /** Fixed bottom-right floating invite to the game-discussion WhatsApp group. */
  private renderWhatsappGroupButton(): HTMLElement {
    const link = document.createElement("a");
    link.className = "whatsapp-float-btn";
    link.href = "https://chat.whatsapp.com/FEvheh8S3HZ89MYEFLj1qm";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", t("home.whatsappGroup.label"));
    link.title = t("home.whatsappGroup.label");
    link.innerHTML = `
      <svg viewBox="0 0 448 512" width="26" height="26" fill="#ffffff" aria-hidden="true">
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

  private renderMenuPanel(): HTMLElement {
    const nav = document.createElement("div");
    nav.className = "home-menu-panel";

    const leaderboardBtn = document.createElement("button");
    leaderboardBtn.type = "button";
    leaderboardBtn.className = "btn-secondary";
    leaderboardBtn.textContent = t("home.menu.leaderboard");
    leaderboardBtn.addEventListener("click", () =>
      this.closeMenuAnd(() => this.onOpenLeaderboard()),
    );
    nav.appendChild(leaderboardBtn);

    const scoringInfoBtn = document.createElement("button");
    scoringInfoBtn.type = "button";
    scoringInfoBtn.className = "btn-secondary";
    scoringInfoBtn.textContent = t("home.menu.scoringInfo");
    scoringInfoBtn.addEventListener("click", () =>
      this.closeMenuAnd(() => this.onOpenScoringInfo()),
    );
    nav.appendChild(scoringInfoBtn);

    const timeKillerBtn = document.createElement("button");
    timeKillerBtn.type = "button";
    timeKillerBtn.className = "btn-secondary";
    timeKillerBtn.textContent = t("home.menu.timeKiller");
    timeKillerBtn.addEventListener("click", () =>
      this.closeMenuAnd(() => this.onOpenTimeKiller()),
    );
    nav.appendChild(timeKillerBtn);

    const sportsWorldBtn = document.createElement("button");
    sportsWorldBtn.type = "button";
    sportsWorldBtn.className = "btn-secondary";
    sportsWorldBtn.textContent = t("home.menu.sportsWorld");
    sportsWorldBtn.addEventListener("click", () =>
      this.closeMenuAnd(() => this.onOpenSportsHub()),
    );
    nav.appendChild(sportsWorldBtn);

    if (this.currentUser) {
      const createLeagueBtn = document.createElement("button");
      createLeagueBtn.type = "button";
      createLeagueBtn.className = "btn-secondary";
      createLeagueBtn.textContent = t("home.menu.createLeague");
      createLeagueBtn.addEventListener("click", () =>
        this.closeMenuAnd(() => this.onCreateLeague()),
      );
      nav.appendChild(createLeagueBtn);

      const myChallengesBtn = document.createElement("button");
      myChallengesBtn.type = "button";
      myChallengesBtn.className = "btn-secondary";
      myChallengesBtn.textContent = t("home.menu.myChallenges");
      myChallengesBtn.addEventListener("click", () =>
        this.closeMenuAnd(() => this.onOpenMyChallenges()),
      );
      if (CHALLENGE_FEATURE_ENABLED) nav.appendChild(myChallengesBtn);

      this.myLeagues.forEach((league) => {
        const leagueBtn = document.createElement("button");
        leagueBtn.type = "button";
        leagueBtn.className = "btn-secondary";
        leagueBtn.dir = "auto";
        leagueBtn.textContent = t("home.menu.leagueTable", {
          name: league.name,
        });
        leagueBtn.addEventListener("click", () =>
          this.closeMenuAnd(() => this.onOpenLeagueLeaderboard(league)),
        );
        nav.appendChild(leagueBtn);
      });
    }

    if (isAdmin(this.currentUser)) {
      const adminBtn = document.createElement("button");
      adminBtn.type = "button";
      adminBtn.className = "btn-secondary";
      adminBtn.textContent = t("home.menu.admin");
      adminBtn.addEventListener("click", () =>
        this.closeMenuAnd(() => this.onOpenAdmin()),
      );
      nav.appendChild(adminBtn);
    }

    return nav;
  }

  private renderSchedule(): HTMLElement {
    const section = document.createElement("div");
    section.className = "home-schedule";

    const heading = document.createElement("h2");
    heading.textContent = t("home.schedule.title");
    section.appendChild(heading);

    const upcomingGames = this.games.filter((g) => !g.result);
    const finishedGames = this.games.filter((g) => g.result);
    const nextGame = upcomingGames[0];
    const activeGameId = getActiveGameId(this.games);

    const tabs = document.createElement("div");
    tabs.className = "schedule-tabs";

    const upcomingTab = document.createElement("button");
    upcomingTab.type = "button";
    upcomingTab.className =
      "schedule-tab" + (this.activeTab === "upcoming" ? " active" : "");
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
      "schedule-tab" + (this.activeTab === "finished" ? " active" : "");
    finishedTab.textContent = t("home.tab.finished", {
      n: finishedGames.length,
    });
    finishedTab.addEventListener("click", () => {
      this.activeTab = "finished";
      this.render();
    });
    tabs.appendChild(finishedTab);

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

    const card = document.createElement("div");
    card.className = "game-card" + (isNext ? " next-game" : "");

    const meta = document.createElement("div");
    meta.className = "game-meta";
    meta.innerHTML = `
      <span class="game-competition">${tDynamic(game.competition)}</span>
      <span class="game-date">${game.date}${game.time ? ` &middot; ${game.time}` : ` &middot; ${t("home.game.timeTBD")}`}</span>
    `;
    card.appendChild(meta);

    if (isNext && !game.result) {
      const lockAt = gameDateTime(game).getTime() - SCORE_LOCK_MS;
      const countdown = document.createElement("div");
      countdown.className = "game-countdown";
      countdown.dataset.lockAt = String(lockAt);
      countdown.textContent = formatCountdown(lockAt - Date.now());
      card.appendChild(countdown);
    }

    const prizeDescription = PRIZE_GAME_IDS.get(game.id);
    if (prizeDescription) {
      const prizeBadge = document.createElement("span");
      prizeBadge.className = "prize-game-badge";
      prizeBadge.title = tDynamic(prizeDescription);
      prizeBadge.textContent = t("home.game.prizeBadge");
      card.appendChild(prizeBadge);

      const prizeCaption = document.createElement("p");
      prizeCaption.className = "prize-game-caption";
      prizeCaption.dir = "auto";
      prizeCaption.textContent = t("home.game.prizeLabel", {
        prize: tDynamic(prizeDescription),
      });
      card.appendChild(prizeCaption);

      const linkUrl = PRIZE_LINK_URLS.get(game.id);
      if (linkUrl) {
        const linkBtn = document.createElement("a");
        linkBtn.className = "btn-secondary prize-link-btn";
        linkBtn.href = linkUrl;
        linkBtn.target = "_blank";
        linkBtn.rel = "noopener noreferrer";
        linkBtn.textContent = t("home.game.festivalDetails");
        linkBtn.addEventListener("click", () =>
          trackLinkEvent(`prize_link_${game.id}`),
        );
        card.appendChild(linkBtn);
      }
    }

    if (isNext) {
      const badge = document.createElement("span");
      badge.className = "next-game-badge";
      badge.textContent = t("home.game.nextBadge");
      card.appendChild(badge);
    }

    const matchup = document.createElement("div");
    matchup.className = "game-matchup";
    matchup.innerHTML = `
      <div class="game-team">
          <img src="${home.logo}" alt="${teamName(home)}" />
          <span dir="auto">${teamName(home)}</span>
      </div>
      <span class="game-vs">${t("home.game.vs")}</span>
      <div class="game-team">
          <img src="${away.logo}" alt="${teamName(away)}" />
          <span dir="auto">${teamName(away)}</span>
      </div>
    `;
    card.appendChild(matchup);

    if (game.result) {
      const resultEl = document.createElement("div");
      resultEl.className = "game-result";
      resultEl.textContent = `${game.result.home} - ${game.result.away}`;
      card.appendChild(resultEl);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-secondary game-guess-btn";
      btn.textContent = this.myPredictions.has(game.id)
        ? t("home.game.viewMyPrediction")
        : t("home.game.viewAveragePrediction");
      btn.addEventListener("click", () => this.onEnterGame(game));
      card.appendChild(btn);
    } else {
      const alreadyPredicted = this.myPredictions.has(game.id);
      if (alreadyPredicted) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-primary game-guess-btn";
        btn.textContent = t("home.game.viewPrediction");
        btn.addEventListener("click", () => this.onEnterGame(game));
        card.appendChild(btn);
      } else if (isActive) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-primary game-guess-btn";
        btn.textContent = t("home.game.predict");
        btn.addEventListener("click", () => this.onEnterGame(game));
        card.appendChild(btn);
      } else {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-secondary game-guess-btn";
        btn.disabled = true;
        btn.textContent = isScoreLocked(game)
          ? t("home.game.locked")
          : t("home.game.opensAfterPrevious");
        card.appendChild(btn);
      }

      if (CHALLENGE_FEATURE_ENABLED && this.currentUser && isActive) {
        const alreadyInChallenge =
          this.challengeEligibilityGameId === game.id &&
          this.challengeEligibility?.alreadyInChallenge;
        if (!alreadyInChallenge) {
          const challengeBtn = document.createElement("button");
          challengeBtn.type = "button";
          challengeBtn.className = "btn-secondary challenge-game-btn";
          challengeBtn.textContent = t("challenge.gameBtn");
          challengeBtn.addEventListener("click", () =>
            this.onChallengeGame(game),
          );
          card.appendChild(challengeBtn);
        }
      }
    }

    return card;
  }
}
