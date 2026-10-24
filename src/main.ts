import "@fontsource/karantina/hebrew-700.css";
import "@fontsource/karantina/latin-700.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/ibm-plex-sans-hebrew/hebrew-400.css";
import "@fontsource/ibm-plex-sans-hebrew/hebrew-500.css";
import "@fontsource/ibm-plex-sans-hebrew/hebrew-700.css";
import "@fontsource/ibm-plex-sans-hebrew/latin-400.css";
import "@fontsource/ibm-plex-sans-hebrew/latin-500.css";
import "@fontsource/ibm-plex-sans-hebrew/latin-700.css";
import "./styles/tokens.css";
import "./styles/components.css";
import "./style.css";
import { initLang, t } from "./i18n/i18n";
import { HomeScreen } from "./home/HomeScreen";
import { PredictionScreen } from "./prediction/PredictionScreen";
import { LeaderboardScreen } from "./leaderboard/LeaderboardScreen";
import { TournamentScreen } from "./tournament/TournamentScreen";
import { AdminScreen } from "./admin/AdminScreen";
import { ScoringInfoScreen } from "./scoring/ScoringInfoScreen";
import { TimeKillerScreen } from "./media/TimeKillerScreen";
import { PrivacyPolicyScreen } from "./privacy/PrivacyPolicyScreen";
import { AboutScreen } from "./about/AboutScreen";
import { NicknamePrompt } from "./nickname/NicknamePrompt";
import { CreateLeagueModal } from "./leagues/CreateLeagueModal";
import { JoinLeaguePrompt } from "./leagues/JoinLeaguePrompt";
import { LeaguesHubScreen } from "./leagues/LeaguesHubScreen";
import { CreateChallengeModal } from "./challenges/CreateChallengeModal";
import { JoinChallengePrompt } from "./challenges/JoinChallengePrompt";
import { MyChallengesScreen } from "./challenges/MyChallengesScreen";
import { CancellationNotice } from "./challenges/CancellationNotice";
import { SportsHomeScreen } from "./sportsHub/SportsHomeScreen";
import { LeaguesScreen } from "./sportsHub/LeaguesScreen";
import { TeamsScreen } from "./sportsHub/TeamsScreen";
import { TeamPageScreen } from "./sportsHub/TeamPageScreen";
import { InstallPrompt } from "./pwa/InstallPrompt";
import { auth, onAuthChange, signInWithGoogle } from "./firebase/firebase";
import {
  getMe,
  getGames,
  getPlayers,
  getMyPredictions,
  getMyLeagues,
  reportClientError,
  trackLinkEvent,
} from "./api/backend";
import type { ScheduleGame } from "./schedule/schedule";
import type { Player } from "./prediction/types";
import { AppNav, type TabId } from "./ui/Nav";
import { skeleton } from "./ui/ScreenHeader";
import { initHoverEffects } from "./ui/hover";

initHoverEffects();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

initLang();

// Logs one "site_visit" link-event per browser tab session, tagged with the
// `?src=` query param if the entry link had one (e.g. `?src=wa-main-group`) -
// lets us tell apart traffic from different shared links/groups later.
function trackVisitSource() {
  const SESSION_KEY = "visitTracked";
  if (sessionStorage.getItem(SESSION_KEY)) return;
  sessionStorage.setItem(SESSION_KEY, "1");
  const src = new URLSearchParams(location.search).get("src");
  trackLinkEvent("site_visit", src);
}
trackVisitSource();

const installPrompt = new InstallPrompt();

// Catches anything that slips past every try/catch below, so a remote bug
// report doesn't depend on someone describing a blank/broken screen to us.
window.addEventListener("error", (e) => {
  reportClientError(e.message, "window.onerror");
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason;
  reportClientError(
    reason instanceof Error ? reason.message : String(reason),
    "unhandledrejection",
  );
});

const root = (id: string) => document.getElementById(id)!;
const homeRootEl = root("home-root");

const nicknamePrompt = new NicknamePrompt();
const cancellationNotice = new CancellationNotice();

let homeScreenRef: HomeScreen | null = null;
let leaguesHubRef: LeaguesHubScreen | null = null;

/** Google sign-in from any entry point (top bar, home card, leagues tab). Errors surface on the home screen. */
function signIn() {
  signInWithGoogle().catch((e) => {
    console.error(e);
    const message = t("home.signInError", {
      msg: e instanceof Error ? e.message : String(e),
    });
    reportClientError(message, "HomeScreen:signIn");
    homeScreenRef?.setAuthError(message);
  });
}

// ---- Navigation shell -------------------------------------------------------
// Every screen keeps its own show()/hide(); this only makes sure exactly one is
// visible, the chrome reflects where we are, and the page starts at the top.

interface Screen {
  hide(): void;
}
const screens: Screen[] = [];
let currentShow: (() => void) | null = null;
let currentReshowsOnLangChange = false;

const nav = new AppNav({
  onTab: (tab) => navTo[tab](),
  onSignIn: signIn,
  onOpenScoringInfo: () => navTo.scoring(),
  onOpenTimeKiller: () => navTo.timeKiller(),
  onOpenSportsHub: () => navTo.sports(),
  onCreateLeague: () => createLeagueModal?.show(),
  onOpenMyChallenges: () => navTo.myChallenges(),
  onOpenAdmin: () => navTo.admin(),
  onInstall: () => installPrompt.showManual(),
  onOpenAbout: () => navTo.about(),
  onOpenPrivacy: () => navTo.privacy(),
});

function open(
  show: () => void,
  opts: { tab: TabId | null; flow?: boolean; reshowOnLang?: boolean },
) {
  nav.closeMore();
  screens.forEach((s) => s.hide());
  nav.setActive(opts.tab);
  nav.setFlowMode(!!opts.flow);
  window.scrollTo({ top: 0 });
  currentShow = show;
  currentReshowsOnLangChange = !!opts.reshowOnLang;
  show();
}

// Screens that don't re-render themselves on a language switch get re-shown.
window.addEventListener("langchange", () => {
  if (currentReshowsOnLangChange) currentShow?.();
});

// Filled in by bootstrap() once games/players are loaded.
const navTo: Record<
  | "home"
  | "leaderboard"
  | "leagues"
  | "tournament"
  | "scoring"
  | "timeKiller"
  | "sports"
  | "myChallenges"
  | "admin"
  | "about"
  | "privacy",
  () => void
> = {
  home: () => {},
  leaderboard: () => {},
  leagues: () => {},
  tournament: () => {},
  scoring: () => {},
  timeKiller: () => {},
  sports: () => {},
  myChallenges: () => {},
  admin: () => {},
  about: () => {},
  privacy: () => {},
};

let createLeagueModal: CreateLeagueModal | null = null;

async function refreshMyPredictions() {
  if (!auth.currentUser) return;
  try {
    const list = await getMyPredictions();
    homeScreenRef?.setMyPredictions(list);
    nav.setScore(list.reduce((sum, p) => sum + (p.score ?? 0), 0));
  } catch (err) {
    console.warn("Could not load my predictions:", err);
  }
}

async function refreshMyLeagues() {
  if (!auth.currentUser) return;
  try {
    const leagues = await getMyLeagues();
    homeScreenRef?.setMyLeagues(leagues);
    leaguesHubRef?.setLeagues(leagues);
  } catch (err) {
    console.warn("Could not load my leagues:", err);
  }
}

onAuthChange(async (user) => {
  if (!user) {
    homeScreenRef?.setMyPredictions([]);
    homeScreenRef?.setMyLeagues([]);
    leaguesHubRef?.setLeagues([]);
    return;
  }
  homeScreenRef?.setAuthError(null);
  try {
    const me = await getMe();
    if (!me.nickname) nicknamePrompt.show(() => {});
  } catch (err) {
    console.warn("Could not check nickname:", err);
  }

  await refreshMyPredictions();
  await refreshMyLeagues();
  cancellationNotice.checkAndShow();
});

homeRootEl.classList.remove("hidden");
const bootSkeleton = document.createElement("div");
bootSkeleton.className = "screen screen--wide";
bootSkeleton.appendChild(skeleton("cards", 3));
homeRootEl.appendChild(bootSkeleton);

async function bootstrap() {
  let games: ScheduleGame[] = [];
  let players: Player[] = [];
  try {
    [games, players] = await Promise.all([getGames(), getPlayers()]);
  } catch (err) {
    console.error("Could not load games/players:", err);
  }

  const goHome = () => navTo.home();

  const predictionScreen = new PredictionScreen(
    root("prediction-root"),
    goHome,
    players,
    () => refreshMyPredictions(),
  );

  const leaderboardScreen = new LeaderboardScreen(root("leaderboard-root"), goHome, games);

  const tournamentScreen = new TournamentScreen(root("tournament-root"), goHome);

  createLeagueModal = new CreateLeagueModal(() => refreshMyLeagues());
  const joinLeaguePrompt = new JoinLeaguePrompt();
  const createChallengeModal = new CreateChallengeModal();
  const joinChallengePrompt = new JoinChallengePrompt();

  const adminScreen = new AdminScreen(root("admin-root"), games, goHome, players);
  const scoringInfoScreen = new ScoringInfoScreen(root("scoring-info-root"), goHome);
  const timeKillerScreen = new TimeKillerScreen(root("time-killer-root"), goHome);
  const privacyScreen = new PrivacyPolicyScreen(root("privacy-root"), goHome);
  const aboutScreen = new AboutScreen(root("about-root"), goHome);
  const myChallengesScreen = new MyChallengesScreen(root("my-challenges-root"), goHome);

  const sportsHomeScreen = new SportsHomeScreen(
    root("sports-home-root"),
    goHome,
    (sportId) => open(() => leaguesScreen.show(sportId), { tab: null }),
  );
  const leaguesScreen = new LeaguesScreen(
    root("sports-leagues-root"),
    () => open(() => sportsHomeScreen.show(), { tab: null }),
    (sportId, leagueId) => open(() => teamsScreen.show(sportId, leagueId), { tab: null }),
  );
  const teamsScreen = new TeamsScreen(
    root("sports-teams-root"),
    games,
    (sportId) => open(() => leaguesScreen.show(sportId), { tab: null }),
    (teamId, sportId, leagueId) =>
      open(() => teamPageScreen.show(teamId, sportId, leagueId), { tab: null }),
  );
  const teamPageScreen = new TeamPageScreen(
    root("sports-team-page-root"),
    games,
    (sportId, leagueId) => open(() => teamsScreen.show(sportId, leagueId), { tab: null }),
  );

  const leaguesHub = new LeaguesHubScreen(root("leagues-hub-root"), {
    onBack: goHome,
    onOpenLeague: (league) =>
      open(() => leaderboardScreen.showLeague(league.id), { tab: "leagues", reshowOnLang: true }),
    onCreateLeague: () => createLeagueModal?.show(),
    onOpenTournament: () => navTo.tournament(),
    onOpenMyChallenges: () => navTo.myChallenges(),
    onSignIn: signIn,
  });
  leaguesHubRef = leaguesHub;

  const homeScreen = new HomeScreen(homeRootEl, games, {
    onEnterGame: (game) => open(() => predictionScreen.show(game), { tab: null, flow: true }),
    onOpenLeaderboard: () => navTo.leaderboard(),
    onOpenTournament: () => navTo.tournament(),
    onOpenLeagues: () => navTo.leagues(),
    onInstallClick: () => installPrompt.showManual(),
    onOpenPrivacy: () => navTo.privacy(),
    onOpenAbout: () => navTo.about(),
    onChallengeGame: (game) =>
      createChallengeModal.show(game.id, () =>
        homeScreenRef?.refreshChallengeEligibility(),
      ),
    onSignIn: signIn,
  });
  homeScreenRef = homeScreen;

  screens.push(
    homeScreen,
    predictionScreen,
    leaderboardScreen,
    tournamentScreen,
    adminScreen,
    scoringInfoScreen,
    timeKillerScreen,
    privacyScreen,
    aboutScreen,
    myChallengesScreen,
    sportsHomeScreen,
    leaguesScreen,
    teamsScreen,
    teamPageScreen,
    leaguesHub,
  );

  Object.assign(navTo, {
    home: () => open(() => homeScreen.show(), { tab: "home" }),
    leaderboard: () => open(() => leaderboardScreen.show(), { tab: "leaderboard", reshowOnLang: true }),
    leagues: () => open(() => leaguesHub.show(), { tab: "leagues" }),
    tournament: () => open(() => tournamentScreen.show(), { tab: "leagues", reshowOnLang: true }),
    scoring: () => open(() => scoringInfoScreen.show(), { tab: "more", reshowOnLang: true }),
    timeKiller: () => open(() => timeKillerScreen.show(), { tab: "more", reshowOnLang: true }),
    sports: () => open(() => sportsHomeScreen.show(), { tab: "more" }),
    myChallenges: () => open(() => myChallengesScreen.show(), { tab: "leagues", reshowOnLang: true }),
    admin: () => open(() => adminScreen.show(), { tab: "more" }),
    about: () => open(() => aboutScreen.show(), { tab: "more", reshowOnLang: true }),
    privacy: () => open(() => privacyScreen.show(), { tab: "more", reshowOnLang: true }),
  });

  homeRootEl.innerHTML = "";
  await refreshMyPredictions();
  await refreshMyLeagues();
  navTo.home();

  const joinCode = new URLSearchParams(window.location.search).get("league");
  if (joinCode) {
    joinLeaguePrompt.show(joinCode, () => refreshMyLeagues());
  }

  const challengeId = new URLSearchParams(window.location.search).get(
    "challenge",
  );
  if (challengeId) {
    joinChallengePrompt.show(challengeId, () =>
      homeScreenRef?.refreshChallengeEligibility(),
    );
  }
}

bootstrap();
