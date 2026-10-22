import "./style.css";
import { initLang } from "./i18n/i18n";
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
import { CreateChallengeModal } from "./challenges/CreateChallengeModal";
import { JoinChallengePrompt } from "./challenges/JoinChallengePrompt";
import { MyChallengesScreen } from "./challenges/MyChallengesScreen";
import { CancellationNotice } from "./challenges/CancellationNotice";
import { SportsHomeScreen } from "./sportsHub/SportsHomeScreen";
import { LeaguesScreen } from "./sportsHub/LeaguesScreen";
import { TeamsScreen } from "./sportsHub/TeamsScreen";
import { TeamPageScreen } from "./sportsHub/TeamPageScreen";
import { InstallPrompt } from "./pwa/InstallPrompt";
import { auth, onAuthChange } from "./firebase/firebase";
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
import { registerBonusQuestions } from "./schedule/schedule";
import type { Player } from "./prediction/types";

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

const homeRootEl = document.getElementById("home-root")!;
const predictionRootEl = document.getElementById("prediction-root")!;
const leaderboardRootEl = document.getElementById("leaderboard-root")!;
const tournamentRootEl = document.getElementById("tournament-root")!;
const adminRootEl = document.getElementById("admin-root")!;
const scoringInfoRootEl = document.getElementById("scoring-info-root")!;
const timeKillerRootEl = document.getElementById("time-killer-root")!;
const privacyRootEl = document.getElementById("privacy-root")!;
const aboutRootEl = document.getElementById("about-root")!;
const myChallengesRootEl = document.getElementById("my-challenges-root")!;
const sportsHomeRootEl = document.getElementById("sports-home-root")!;
const sportsLeaguesRootEl = document.getElementById("sports-leagues-root")!;
const sportsTeamsRootEl = document.getElementById("sports-teams-root")!;
const sportsTeamPageRootEl = document.getElementById(
  "sports-team-page-root",
)!;

const nicknamePrompt = new NicknamePrompt();
const cancellationNotice = new CancellationNotice();

let homeScreenRef: HomeScreen | null = null;

async function refreshMyPredictions() {
  if (!auth.currentUser) return;
  try {
    const list = await getMyPredictions();
    homeScreenRef?.setMyPredictions(list);
  } catch (err) {
    console.warn("Could not load my predictions:", err);
  }
}

async function refreshMyLeagues() {
  if (!auth.currentUser) return;
  try {
    const leagues = await getMyLeagues();
    homeScreenRef?.setMyLeagues(leagues);
  } catch (err) {
    console.warn("Could not load my leagues:", err);
  }
}

onAuthChange(async (user) => {
  if (!user) return;
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

homeRootEl.innerHTML =
  '<p class="counter-text" style="text-align:center;padding:40px;">טוען...</p>';

async function bootstrap() {
  let games: ScheduleGame[] = [];
  let players: Player[] = [];
  try {
    [games, players] = await Promise.all([getGames(), getPlayers()]);
  } catch (err) {
    console.error("Could not load games/players:", err);
  }
  registerBonusQuestions(games);

  const predictionScreen = new PredictionScreen(
    predictionRootEl,
    () => {
      predictionScreen.hide();
      homeScreen.show();
    },
    players,
    () => refreshMyPredictions(),
  );

  const leaderboardScreen = new LeaderboardScreen(
    leaderboardRootEl,
    () => {
      leaderboardScreen.hide();
      homeScreen.show();
    },
    games,
  );

  const tournamentScreen = new TournamentScreen(tournamentRootEl, () => {
    tournamentScreen.hide();
    homeScreen.show();
  });

  const createLeagueModal = new CreateLeagueModal(() => refreshMyLeagues());
  const joinLeaguePrompt = new JoinLeaguePrompt();
  const createChallengeModal = new CreateChallengeModal();
  const joinChallengePrompt = new JoinChallengePrompt();

  const adminScreen = new AdminScreen(
    adminRootEl,
    games,
    () => {
      adminScreen.hide();
      homeScreen.show();
    },
    players,
  );

  const scoringInfoScreen = new ScoringInfoScreen(scoringInfoRootEl, () => {
    scoringInfoScreen.hide();
    homeScreen.show();
  });

  const timeKillerScreen = new TimeKillerScreen(timeKillerRootEl, () => {
    timeKillerScreen.hide();
    homeScreen.show();
  });

  const privacyScreen = new PrivacyPolicyScreen(privacyRootEl, () => {
    privacyScreen.hide();
    homeScreen.show();
  });

  const aboutScreen = new AboutScreen(aboutRootEl, () => {
    aboutScreen.hide();
    homeScreen.show();
  });

  const myChallengesScreen = new MyChallengesScreen(myChallengesRootEl, () => {
    myChallengesScreen.hide();
    homeScreen.show();
  });

  const sportsHomeScreen = new SportsHomeScreen(
    sportsHomeRootEl,
    () => {
      sportsHomeScreen.hide();
      homeScreen.show();
    },
    (sportId) => {
      sportsHomeScreen.hide();
      leaguesScreen.show(sportId);
    },
  );

  const leaguesScreen = new LeaguesScreen(
    sportsLeaguesRootEl,
    () => {
      leaguesScreen.hide();
      sportsHomeScreen.show();
    },
    (sportId, leagueId) => {
      leaguesScreen.hide();
      teamsScreen.show(sportId, leagueId);
    },
  );

  const teamsScreen = new TeamsScreen(
    sportsTeamsRootEl,
    games,
    (sportId) => {
      teamsScreen.hide();
      leaguesScreen.show(sportId);
    },
    (teamId, sportId, leagueId) => {
      teamsScreen.hide();
      teamPageScreen.show(teamId, sportId, leagueId);
    },
  );

  const teamPageScreen = new TeamPageScreen(
    sportsTeamPageRootEl,
    games,
    (sportId, leagueId) => {
      teamPageScreen.hide();
      teamsScreen.show(sportId, leagueId);
    },
  );

  const homeScreen = new HomeScreen(
    homeRootEl,
    games,
    (game) => {
      homeScreen.hide();
      predictionScreen.show(game);
    },
    () => {
      homeScreen.hide();
      leaderboardScreen.show();
    },
    () => {
      homeScreen.hide();
      tournamentScreen.show();
    },
    () => {
      homeScreen.hide();
      adminScreen.show();
    },
    () => {
      homeScreen.hide();
      scoringInfoScreen.show();
    },
    () => {
      homeScreen.hide();
      timeKillerScreen.show();
    },
    () => createLeagueModal.show(),
    (league) => {
      homeScreen.hide();
      leaderboardScreen.showLeague(league.id);
    },
    () => installPrompt.showManual(),
    () => {
      homeScreen.hide();
      privacyScreen.show();
    },
    () => {
      homeScreen.hide();
      aboutScreen.show();
    },
    (game) =>
      createChallengeModal.show(game.id, () =>
        homeScreenRef?.refreshChallengeEligibility(),
      ),
    () => {
      homeScreen.hide();
      myChallengesScreen.show();
    },
    () => {
      homeScreen.hide();
      sportsHomeScreen.show();
    },
  );

  homeScreenRef = homeScreen;
  await refreshMyPredictions();
  await refreshMyLeagues();
  homeScreen.show();

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
