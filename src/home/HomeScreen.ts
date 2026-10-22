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

    wrapper.appendChild(this.renderTopBar());
    wrapper.appendChild(this.renderHero());
    wrapper.appendChild(this.renderSchedule());
    wrapper.appendChild(this.renderTournamentBanner());
    wrapper.appendChild(this.renderFooter());

    const dock = this.renderDock();
    if (dock) wrapper.appendChild(dock);

    this.container.appendChild(wrapper);
    fitText(this.container);
  }

  // ---------------------------------------------------------------------
  // Top bar: brand pill + menu button on one side, account pill on the other
  // ---------------------------------------------------------------------

  private renderTopBar(): HTMLElement {
    const bar = document.createElement("header");
    bar.className = "topbar" + (this.menuOpen ? " menu-open" : "");

    const start = document.createElement("div");
    start.className = "topbar-group";

    const brand = document.createElement("span");
    brand.className = "pill pill-dark topbar-brand";
    brand.textContent = GAME_TITLE;
    start.appendChild(brand);

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "pill-round";
    toggleBtn.setAttribute("aria-expanded", String(this.menuOpen));
    toggleBtn.setAttribute(
      "aria-label",
      this.menuOpen ? t("home.menu.close") : t("home.menu.open"),
    );
    toggleBtn.innerHTML = `<span></span><span></span>`;
    toggleBtn.addEventListener("click", () => {
      this.menuOpen = !this.menuOpen;
      this.render();
    });
    start.appendChild(toggleBtn);
    bar.appendChild(start);

    const end = document.createElement("div");
    end.className = "topbar-group";

    if (this.currentUser) {
      const name =
        this.currentUser.displayName ?? this.currentUser.email ?? "משתמש";
      const user = document.createElement("span");
      user.className = "pill pill-dark topbar-user";
      user.innerHTML = `
        ${this.currentUser.photoURL ? `<img src="${this.currentUser.photoURL}" alt="" referrerpolicy="no-referrer" />` : ""}
        <span class="topbar-user-name" dir="auto">${name}</span>
        <span class="topbar-user-score">${this.myTotalScore}</span>
      `;
      user.title = `${t("home.myScore")}: ${this.myTotalScore}`;
      end.appendChild(user);
    } else {
      const signInBtn = document.createElement("button");
      signInBtn.type = "button";
      signInBtn.className = "pill pill-dark";
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
      end.appendChild(signInBtn);
    }
    bar.appendChild(end);

    if (this.menuOpen) bar.appendChild(this.renderMenuPanel());

    if (this.authError) {
      const errorEl = document.createElement("p");
      errorEl.className = "auth-error";
      errorEl.dir = "auto";
      errorEl.textContent = this.authError;
      bar.appendChild(errorEl);
    }

    return bar;
  }

  /** The always-visible destinations, in menu order. */
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
      {
        label: t("home.tournamentTitle"),
        action: () => this.onOpenTournament(),
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

  /** Runs before navigating away from any menu item, so the panel isn't left open when the user comes back to the home screen. */
  private closeMenuAnd(action: () => void) {
    this.menuOpen = false;
    action();
  }

  private renderMenuPanel(): HTMLElement {
    const nav = document.createElement("nav");
    nav.className = "menu-panel";

    const big = document.createElement("div");
    big.className = "menu-panel-big";
    this.primaryLinks().forEach(({ label, action }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "menu-panel-link";
      btn.textContent = label;
      btn.addEventListener("click", () => this.closeMenuAnd(action));
      big.appendChild(btn);
    });
    nav.appendChild(big);

    const small = document.createElement("div");
    small.className = "menu-panel-small";
    const addSmall = (label: string, action: () => void) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "menu-panel-sub";
      btn.dir = "auto";
      btn.textContent = label;
      btn.addEventListener("click", () => this.closeMenuAnd(action));
      small.appendChild(btn);
    };

    if (this.currentUser) {
      if (CHALLENGE_FEATURE_ENABLED) {
        addSmall(t("home.menu.myChallenges"), () => this.onOpenMyChallenges());
      }
      this.myLeagues.forEach((league) =>
        addSmall(t("home.menu.leagueTable", { name: league.name }), () =>
          this.onOpenLeagueLeaderboard(league),
        ),
      );
    }
    if (isAdmin(this.currentUser)) {
      addSmall(t("home.menu.admin"), () => this.onOpenAdmin());
    }
    addSmall(t("home.about"), () => this.onOpenAbout());
    addSmall(t("home.privacy"), () => this.onOpenPrivacy());
    if (!isRunningStandalone()) {
      addSmall(t("home.install"), () => this.onInstallClick());
    }
    addSmall(t("home.langToggle"), () =>
      setLang(getLang() === "he" ? "en" : "he"),
    );
    if (this.currentUser) {
      addSmall(t("home.signOut"), () => signOutUser());
    }
    nav.appendChild(small);

    return nav;
  }

  // ---------------------------------------------------------------------
  // Hero: two short meta columns + a staggered, edge-to-edge headline
  // ---------------------------------------------------------------------

  private renderHero(): HTMLElement {
    const hero = document.createElement("section");
    hero.className = "hero";

    const jerusalem = TEAMS[HAPOEL_JERUSALEM_TEAM_ID];
    hero.innerHTML = `
      <div class="hero-meta">
        <p>${t("home.hero.meta1")}</p>
        <p>${t("home.hero.meta2")}</p>
      </div>
      <h1 class="hero-title fit-text" data-fit-max="420">
        <span class="fit-line hero-line hero-line-1"><span>${t("home.hero.l1a")}<sup class="hero-mark">©</sup></span><span>${t("home.hero.l1b")}</span></span>
        <span class="fit-line hero-line hero-line-2"><span>${t("home.hero.l2")}</span></span>
        <span class="fit-line hero-line hero-line-3"><img class="hero-logo" src="${jerusalem.logo}" alt="${teamName(jerusalem)}" /><span>${t("home.hero.l3")}</span></span>
      </h1>
    `;
    return hero;
  }

  // ---------------------------------------------------------------------
  // Schedule: heading row + a two-column grid of colour-panel game cards
  // ---------------------------------------------------------------------

  private renderSchedule(): HTMLElement {
    const section = document.createElement("section");
    section.className = "schedule";
    section.id = "schedule";

    const upcomingGames = this.games.filter((g) => !g.result);
    const finishedGames = this.games.filter((g) => g.result);
    const nextGame = upcomingGames[0];
    const activeGameId = getActiveGameId(this.games);

    const head = document.createElement("div");
    head.className = "section-head";
    head.innerHTML = `<h2 class="section-title">${t("home.schedule.title")}</h2>`;

    const tabs = document.createElement("div");
    tabs.className = "segmented";
    tabs.setAttribute("role", "tablist");
    const makeTab = (tab: "upcoming" | "finished", label: string) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(this.activeTab === tab));
      btn.className = "segmented-btn" + (this.activeTab === tab ? " active" : "");
      btn.textContent = label;
      btn.addEventListener("click", () => {
        this.activeTab = tab;
        this.render();
      });
      tabs.appendChild(btn);
    };
    makeTab("upcoming", t("home.tab.upcoming", { n: upcomingGames.length }));
    makeTab("finished", t("home.tab.finished", { n: finishedGames.length }));
    head.appendChild(tabs);
    section.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "card-grid";

    const list =
      this.activeTab === "upcoming"
        ? upcomingGames
        : finishedGames.slice().reverse();
    list.forEach((game) => {
      grid.appendChild(
        this.buildGameCard(
          game,
          this.activeTab === "upcoming" && game === nextGame,
          game.id === activeGameId,
        ),
      );
    });
    section.appendChild(grid);
    return section;
  }

  private buildGameCard(
    game: ScheduleGame,
    isNext: boolean,
    isActive: boolean,
  ): HTMLElement {
    const home = TEAMS[game.homeTeamId];
    const away = TEAMS[game.awayTeamId];
    const homeName = teamName(home);
    const awayName = teamName(away);
    const prizeDescription = PRIZE_GAME_IDS.get(game.id);
    const predicted = this.myPredictions.has(game.id);

    // What happens when the panel is clicked, and how it's labelled.
    let action: (() => void) | null = null;
    let ctaLabel = "";
    let lockedNote = "";
    if (game.result) {
      action = () => this.onEnterGame(game);
      ctaLabel = predicted
        ? t("home.game.viewMyPrediction")
        : t("home.game.viewAveragePrediction");
    } else if (predicted) {
      action = () => this.onEnterGame(game);
      ctaLabel = t("home.game.viewPrediction");
    } else if (isActive) {
      action = () => this.onEnterGame(game);
      ctaLabel = t("home.game.predict");
    } else {
      lockedNote = isScoreLocked(game)
        ? t("home.game.locked")
        : t("home.game.opensAfterPrevious");
    }

    const tone = game.result
      ? "tone-grey"
      : isActive || predicted
        ? "tone-red"
        : prizeDescription
          ? "tone-yellow"
          : "tone-sand";

    const card = document.createElement("article");
    card.className = `game-card ${tone}` + (action ? "" : " is-locked");

    // ---- Colour panel ----
    const panel = document.createElement(action ? "button" : "div");
    panel.className = "game-panel";
    if (panel instanceof HTMLButtonElement) {
      panel.type = "button";
      panel.addEventListener("click", () => action?.());
    }
    panel.setAttribute(
      "aria-label",
      `${homeName} – ${awayName}${ctaLabel ? ` · ${ctaLabel}` : ""}`,
    );

    const centre = game.result
      ? `<span class="game-score"><span>${game.result.home}</span><span class="game-score-sep">:</span><span>${game.result.away}</span></span>`
      : `<span class="game-when"><span class="game-when-date">${game.date.slice(0, 5).replace("/", ".")}</span><span class="game-when-time">${game.time ?? t("home.game.timeTBD")}</span></span>`;

    let topLine = "";
    if (isNext && !game.result) {
      const lockAt = gameDateTime(game).getTime() - SCORE_LOCK_MS;
      topLine = `<span class="game-panel-chip game-countdown" data-lock-at="${lockAt}">${formatCountdown(lockAt - Date.now())}</span>`;
    }

    panel.innerHTML = `
      <span class="game-panel-top">${topLine}</span>
      <span class="game-panel-main">
        <img class="game-logo" src="${home.logo}" alt="" />
        ${centre}
        <img class="game-logo" src="${away.logo}" alt="" />
      </span>
      <span class="game-panel-bottom">${
        ctaLabel
          ? `<span class="game-cta">${ctaLabel} <span aria-hidden="true" class="game-cta-arrow">←</span></span>`
          : `<span class="game-locked">${lockedNote}</span>`
      }</span>
    `;
    card.appendChild(panel);

    // ---- Caption row under the panel ----
    const caption = document.createElement("div");
    caption.className = "game-caption";

    const badges: string[] = [];
    if (isNext) badges.push(`<span class="tag tag-dark">${t("home.game.nextBadge")}</span>`);
    if (game.result) badges.push(`<span class="tag">${t("home.game.final")}</span>`);
    if (prizeDescription)
      badges.push(
        `<span class="tag tag-yellow" title="${tDynamic(prizeDescription).replace(/"/g, "&quot;")}">${t("home.game.prizeShort")}</span>`,
      );

    caption.innerHTML = `
      <span class="game-caption-title">${badges.join("")}<span dir="auto">${homeName} – ${awayName}</span></span>
      <span class="game-caption-meta" dir="auto">${tDynamic(game.competition)} · <bdi>${game.date}</bdi></span>
    `;
    card.appendChild(caption);

    if (prizeDescription || (CHALLENGE_FEATURE_ENABLED && this.currentUser && isActive && !game.result)) {
      const extra = document.createElement("div");
      extra.className = "game-extra";
      if (prizeDescription) {
        const prize = document.createElement("span");
        prize.dir = "auto";
        prize.textContent = t("home.game.prizeLabel", {
          prize: tDynamic(prizeDescription),
        });
        extra.appendChild(prize);
        const linkUrl = PRIZE_LINK_URLS.get(game.id);
        if (linkUrl) {
          const link = document.createElement("a");
          link.className = "text-link prize-link-btn";
          link.href = linkUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = t("home.game.festivalDetails");
          link.addEventListener("click", () =>
            trackLinkEvent(`prize_link_${game.id}`),
          );
          extra.appendChild(link);
        }
      }
      if (CHALLENGE_FEATURE_ENABLED && this.currentUser && isActive && !game.result) {
        const alreadyInChallenge =
          this.challengeEligibilityGameId === game.id &&
          this.challengeEligibility?.alreadyInChallenge;
        if (!alreadyInChallenge) {
          const challengeBtn = document.createElement("button");
          challengeBtn.type = "button";
          challengeBtn.className = "text-link challenge-game-btn";
          challengeBtn.textContent = t("challenge.gameBtn");
          challengeBtn.addEventListener("click", () => this.onChallengeGame(game));
          extra.appendChild(challengeBtn);
        }
      }
      card.appendChild(extra);
    }

    return card;
  }

  // ---------------------------------------------------------------------
  // VIP tournament: one full-width black panel with a caption row
  // ---------------------------------------------------------------------

  private renderTournamentBanner(): HTMLElement {
    const section = document.createElement("section");
    section.className = "vip";

    const desc = this.currentUser
      ? t("home.tournamentDescRules")
      : t("home.tournamentDesc");

    section.innerHTML = `
      <button class="vip-panel" type="button">
        <span class="vip-title fit-text" data-fit-max="260"><span>${t("home.tournamentTitle")}</span></span>
        <span class="vip-prize">${t("home.tournamentPrize")}</span>
      </button>
      <div class="game-caption">
        <span class="game-caption-title"><span class="tag tag-yellow">VIP</span><span>${desc}</span></span>
        <span class="game-caption-meta">${t("home.tournamentBtn")} ←</span>
      </div>
    `;
    section
      .querySelector(".vip-panel")
      ?.addEventListener("click", () => this.onOpenTournament());
    return section;
  }

  // ---------------------------------------------------------------------
  // Footer: black, link columns, giant cropped wordmark
  // ---------------------------------------------------------------------

  private renderFooter(): HTMLElement {
    const footer = document.createElement("footer");
    footer.className = "site-footer";

    const cols = document.createElement("div");
    cols.className = "footer-cols";

    // Column 1: WhatsApp group invite (the "newsletter" slot)
    const join = document.createElement("div");
    join.className = "footer-col footer-join";
    join.innerHTML = `
      <h3 class="footer-head">${t("home.footer.joinTitle")}</h3>
      <p class="footer-text">${t("home.footer.joinText")}</p>
      <a class="pill pill-light" href="https://chat.whatsapp.com/FEvheh8S3HZ89MYEFLj1qm" target="_blank" rel="noopener noreferrer">${t("home.footer.joinBtn")} <span aria-hidden="true">←</span></a>
    `;
    cols.appendChild(join);

    const makeCol = (title: string, items: { label: string; action: () => void }[]) => {
      const col = document.createElement("div");
      col.className = "footer-col";
      const h = document.createElement("h3");
      h.className = "footer-head";
      h.textContent = title;
      col.appendChild(h);
      items.forEach(({ label, action }) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "footer-link";
        btn.textContent = label;
        btn.addEventListener("click", action);
        col.appendChild(btn);
      });
      return col;
    };

    cols.appendChild(makeCol(t("home.footer.index"), this.primaryLinks()));

    const general = [
      { label: t("home.about"), action: () => this.onOpenAbout() },
      { label: t("home.privacy"), action: () => this.onOpenPrivacy() },
      {
        label: t("home.langToggle"),
        action: () => setLang(getLang() === "he" ? "en" : "he"),
      },
    ];
    if (!isRunningStandalone()) {
      general.push({ label: t("home.install"), action: () => this.onInstallClick() });
    }
    cols.appendChild(makeCol(t("home.footer.general"), general));

    footer.appendChild(cols);

    const mark = document.createElement("p");
    mark.className = "footer-mark fit-text";
    mark.setAttribute("aria-hidden", "true");
    mark.innerHTML = `<span>${GAME_TITLE}</span>`;
    footer.appendChild(mark);

    return footer;
  }

  /** Floating pill at the bottom: jump straight into the game that's open for predictions. */
  private renderDock(): HTMLElement | null {
    const activeGameId = getActiveGameId(this.games);
    const game = this.games.find((g) => g.id === activeGameId);
    if (!game || game.result || this.myPredictions.has(game.id)) return null;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dock pill pill-dark";
    btn.innerHTML = `${t("home.dock.predict", {
      team: teamName(
        TEAMS[
          game.homeTeamId === HAPOEL_JERUSALEM_TEAM_ID
            ? game.awayTeamId
            : game.homeTeamId
        ],
      ),
    })} <span aria-hidden="true">←</span>`;
    btn.addEventListener("click", () => this.onEnterGame(game));
    return btn;
  }
}
