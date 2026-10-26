import { auth } from "../firebase/firebase";
import type { ScheduleGame } from "../schedule/schedule";
import type { Player } from "../prediction/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://hapoel-jerusalem-api-354078768099.us-central1.run.app";

// Public, fire-and-forget - reports a client-side error (e.g. auth/network
// failures) to the server so we can see it in logs without needing a
// screenshot from whoever hit it. Deliberately never throws itself.
export function reportClientError(message: string, context?: string) {
  fetch(`${API_BASE_URL}/client-errors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      context,
      url: location.href,
      userAgent: navigator.userAgent,
      uid: auth.currentUser?.uid ?? null,
    }),
  }).catch((err) => console.warn("reportClientError itself failed:", err));
}

// Public, fire-and-forget - counts a click/visit against a tagged link key
// (e.g. a shared game link's `?src=` tag, or an in-app sponsor CTA) so
// traffic sources can be analyzed later. Deliberately never throws.
export function trackLinkEvent(linkKey: string, source?: string | null) {
  fetch(`${API_BASE_URL}/link-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      linkKey,
      source: source || null,
      referrer: document.referrer || null,
      url: location.href,
      userAgent: navigator.userAgent,
    }),
  }).catch((err) => console.warn("trackLinkEvent failed:", err));
}

// Public endpoint (no auth needed) - the schedule is stored in the `games`
// table in Cloud SQL so it can be updated directly in the DB without a
// frontend redeploy.
export async function getGames(): Promise<ScheduleGame[]> {
  const res = await fetch(`${API_BASE_URL}/games`);
  if (!res.ok) throw new Error(`API /games failed (${res.status})`);
  return res.json();
}

// Public endpoint - the roster is stored in the `players` table in Cloud SQL.
export async function getPlayers(): Promise<Player[]> {
  const res = await fetch(`${API_BASE_URL}/players`);
  if (!res.ok) throw new Error(`API /players failed (${res.status})`);
  return res.json();
}

export interface GameResultData {
  actualTopScorerPlayerId: string | null;
  actualTopScorerPoints: number | null;
  actualTopRebounderPlayerId: string | null;
  actualTopRebounds: number | null;
  actualTopAssistPlayerId: string | null;
  actualTopAssists: number | null;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  actualTeamThrees: number | null;
  actualTeamRebounds: number | null;
  actualTeamAssists: number | null;
  actualBonusAnswer: boolean | null;
}

// Public endpoint - the real outcome of a game, once the admin enters it.
export async function getGameResult(
  gameId: string,
): Promise<GameResultData | null> {
  const res = await fetch(
    `${API_BASE_URL}/games/${encodeURIComponent(gameId)}/result`,
  );
  if (!res.ok)
    throw new Error(`API /games/${gameId}/result failed (${res.status})`);
  return res.json();
}

// Public endpoint - the official registered squad (player ids) for a game,
// as published on basket.co.il game day - empty array if not published yet.
export async function getGameSquad(gameId: string): Promise<string[]> {
  const res = await fetch(
    `${API_BASE_URL}/games/${encodeURIComponent(gameId)}/squad`,
  );
  if (!res.ok)
    throw new Error(`API /games/${gameId}/squad failed (${res.status})`);
  const data = await res.json();
  return data.playerIds ?? [];
}

export interface ScoringRules {
  topStatPlayerPoints: number;
  topStatExactPoints: number;
  topStatCloseRange: number;
  topStatClosePoints: number;
  finalScoreExactPoints: number;
  finalScoreMarginPoints: number;
  finalScoreCloseMarginRange: number;
  finalScoreCloseMarginPoints: number;
  finalScoreDirectionPoints: number;
  teamStatExactPoints: number;
  teamStatCloseRange: number;
  teamStatClosePoints: number;
}

// Public endpoint - single source of truth for the "how scoring works" explanation page.
export async function getScoringRules(): Promise<ScoringRules> {
  const res = await fetch(`${API_BASE_URL}/scoring-rules`);
  if (!res.ok) throw new Error(`API /scoring-rules failed (${res.status})`);
  return res.json();
}

export interface PredictionsAggregate {
  totalPredictions: number;
  avgHomeScore: number | null;
  avgAwayScore: number | null;
  topScorerPlayerId: string | null;
  avgTopScorerPoints: number | null;
  topRebounderPlayerId: string | null;
  avgTopRebounds: number | null;
  topAssistPlayerId: string | null;
  avgTopAssists: number | null;
  avgTeamThrees: number | null;
  avgTeamRebounds: number | null;
  avgTeamAssists: number | null;
}

// Public endpoint - aggregate stats (avg score, most-picked leaders) across everyone's predictions for a game.
export async function getPredictionsAggregate(
  gameId: string,
): Promise<PredictionsAggregate> {
  const res = await fetch(
    `${API_BASE_URL}/predictions/aggregate?gameId=${encodeURIComponent(gameId)}`,
  );
  if (!res.ok)
    throw new Error(`API /predictions/aggregate failed (${res.status})`);
  return res.json();
}

async function authedFetch(path: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  let idToken: string;
  try {
    idToken = await user.getIdToken();
  } catch (err) {
    console.warn("getIdToken failed, retrying with a forced refresh:", err);
    try {
      idToken = await user.getIdToken(true);
    } catch (err2) {
      // Distinguish a token-refresh failure from a plain network error below -
      // this stage talks to Google's auth servers, not our own API.
      const message = `getIdToken failed: ${err2 instanceof Error ? err2.message : String(err2)}`;
      reportClientError(message, `authedFetch:${path}`);
      throw new Error(message);
    }
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${idToken}`,
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    const message = `network error calling ${path}: ${err instanceof Error ? err.message : String(err)}`;
    reportClientError(message, `authedFetch:${path}`);
    throw new Error(message);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export interface MeResponse {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  nickname: string | null;
}

export function getMe(): Promise<MeResponse> {
  return authedFetch("/users/me");
}

export function setNickname(nickname: string): Promise<{ nickname: string }> {
  return authedFetch("/users/nickname", {
    method: "POST",
    body: JSON.stringify({ nickname }),
  });
}

/** Deletes the signed-in user's predictions, league memberships, profile row, and Firebase account. */
export function deleteMyAccount(): Promise<{ ok: boolean }> {
  return authedFetch("/users/me", { method: "DELETE" });
}

export function submitPrediction(payload: {
  gameId: string;
  gameDate: string; // YYYY-MM-DD
  predictedForeignPlayerIds: string[];
  topScorerPlayerId: string | null;
  topScorerPoints: number | null;
  topRebounderPlayerId: string | null;
  topRebounds: number | null;
  topAssistPlayerId: string | null;
  topAssists: number | null;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  predictedTeamThrees: number | null;
  predictedTeamRebounds: number | null;
  predictedTeamAssists: number | null;
  predictedBonusAnswer: boolean | null;
}): Promise<{ ok: boolean; id: string }> {
  return authedFetch("/predictions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface MyPrediction {
  gameId: string;
  predictedForeignPlayerIds: string[];
  topScorerPlayerId: string | null;
  topScorerPoints: number | null;
  topRebounderPlayerId: string | null;
  topRebounds: number | null;
  topAssistPlayerId: string | null;
  topAssists: number | null;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  predictedTeamThrees: number | null;
  predictedTeamRebounds: number | null;
  predictedTeamAssists: number | null;
  predictedBonusAnswer: boolean | null;
  score: number | null;
}

export function getMyPrediction(gameId: string): Promise<MyPrediction | null> {
  return authedFetch(`/predictions/mine?gameId=${encodeURIComponent(gameId)}`);
}

export function getMyPredictions(): Promise<MyPrediction[]> {
  return authedFetch("/predictions/mine-all");
}

// Admin-only - number of predictions submitted so far, keyed by gameId.
export function getPredictionCounts(): Promise<Record<string, number>> {
  return authedFetch("/predictions/counts");
}

export interface LinkEventStat {
  link_key: string;
  source: string;
  count: number;
  last_at: string;
}

// Admin-only - aggregated click/visit counts grouped by link key + source tag.
export function getLinkEventStats(): Promise<LinkEventStat[]> {
  return authedFetch("/admin/link-events/stats");
}

export interface LeaderboardRow {
  uid: string;
  name: string;
  total: number;
}

export function getLeaderboard(): Promise<{
  overall: LeaderboardRow[];
  lastGame: LeaderboardRow[];
  lastGameId: string | null;
}> {
  // Public endpoint (no Depends(verify_token) on the backend) - don't require sign-in.
  return fetch(`${API_BASE_URL}/leaderboard`).then((res) => {
    if (!res.ok) throw new Error(`API /leaderboard failed (${res.status})`);
    return res.json();
  });
}

// Public endpoint - same shape as the leaderboard's "lastGame" rows, for any
// specific graded game (powers the "pick a past game" dropdown).
export function getLeaderboardForGame(
  gameId: string,
): Promise<LeaderboardRow[]> {
  return fetch(
    `${API_BASE_URL}/leaderboard/game/${encodeURIComponent(gameId)}`,
  ).then((res) => {
    if (!res.ok)
      throw new Error(`API /leaderboard/game/${gameId} failed (${res.status})`);
    return res.json();
  });
}

// Public endpoint - lets the leaderboard show a specific person's bet for a
// specific game when their name is clicked.
export function getUserPredictionForGame(
  gameId: string,
  uid: string,
): Promise<MyPrediction | null> {
  return fetch(
    `${API_BASE_URL}/predictions/game/${encodeURIComponent(gameId)}/user/${encodeURIComponent(uid)}`,
  ).then((res) => {
    if (!res.ok)
      throw new Error(
        `API /predictions/game/${gameId}/user/${uid} failed (${res.status})`,
      );
    return res.json();
  });
}

export interface LeagueInfo {
  id: string;
  name: string;
  inviteCode: string;
}

export function createLeague(name: string): Promise<LeagueInfo> {
  return authedFetch("/leagues", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getMyLeagues(): Promise<LeagueInfo[]> {
  return authedFetch("/leagues/mine");
}

// Public - used by the join-link landing flow before the user signs in.
export async function getLeagueByCode(
  code: string,
): Promise<{ id: string; name: string }> {
  const res = await fetch(
    `${API_BASE_URL}/leagues/by-code?code=${encodeURIComponent(code)}`,
  );
  if (!res.ok) throw new Error(`API /leagues/by-code failed (${res.status})`);
  return res.json();
}

export function joinLeague(
  code: string,
): Promise<{ id: string; name: string }> {
  return authedFetch("/leagues/join", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function getLeagueLeaderboard(
  leagueId: string,
): Promise<{ name: string; overall: LeaderboardRow[] }> {
  return authedFetch(`/leagues/${encodeURIComponent(leagueId)}/leaderboard`);
}

/** Public endpoint - the special "טורניר ה-VIP" tournament leaderboard (fixed set of 6 games). */
export function getTournamentLeaderboard(): Promise<{
  overall: LeaderboardRow[];
}> {
  return fetch(`${API_BASE_URL}/tournaments/kipa-aduma-100`).then((res) => {
    if (!res.ok)
      throw new Error(`API /tournaments/kipa-aduma-100 failed (${res.status})`);
    return res.json();
  });
}

export function submitGameResult(payload: {
  gameId: string;
  actualForeignPlayerIds: string[];
  actualTopScorerPlayerId: string | null;
  actualTopScorerPoints: number | null;
  actualTopRebounderPlayerId: string | null;
  actualTopRebounds: number | null;
  actualTopAssistPlayerId: string | null;
  actualTopAssists: number | null;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  actualTeamThrees: number | null;
  actualTeamRebounds: number | null;
  actualTeamAssists: number | null;
  actualBonusAnswer: boolean | null;
}): Promise<{ ok: boolean; graded: number }> {
  return authedFetch("/admin/game-results", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------- Friend challenges (per-game 10-point side bets) ----------

export interface Challenge {
  id: number;
  gameId: string;
  question: string;
  creatorAnswer: boolean;
  creatorUid: string;
  creatorName: string;
  opponentUid: string | null;
  opponentName: string | null;
  status: "pending" | "active" | "resolved" | "cancelled";
  winnerUid: string | null;
  points: number;
  createdAt: string | null;
  cancellationReason: string | null;
  // Admin-only (never sent for the public GET /challenges/{id} used by the
  // join link) - result of the external question-plausibility validator.
  validationStatus?:
    | "APPROVED"
    | "REJECTED"
    | "INSUFFICIENT_DATA"
    | "NEEDS_CLARIFICATION"
    | null;
  validationReasonCode?: string | null;
  validationExplanation?: string | null;
}

export interface ChallengeEligibility {
  totalScore: number;
  eligible: boolean;
  alreadyInChallenge: boolean;
}

// Authed - checks eligibility (10+ points, no other open challenge for this game)
// before showing the "create a challenge" form.
export function getChallengeEligibility(
  gameId: string,
): Promise<ChallengeEligibility> {
  return authedFetch(
    `/challenges/eligibility?gameId=${encodeURIComponent(gameId)}`,
  );
}

export function createChallenge(payload: {
  gameId: string;
  question: string;
  creatorAnswer: boolean;
}): Promise<{ id: number }> {
  return authedFetch("/challenges", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Public - the join-link landing page shows the question/creator's pick before sign-in.
export async function getChallenge(id: number | string): Promise<Challenge> {
  const res = await fetch(
    `${API_BASE_URL}/challenges/${encodeURIComponent(String(id))}`,
  );
  if (!res.ok) throw new Error(`API /challenges/${id} failed (${res.status})`);
  return res.json();
}

export function acceptChallenge(id: number | string): Promise<{ ok: boolean }> {
  return authedFetch(`/challenges/${encodeURIComponent(String(id))}/accept`, {
    method: "POST",
  });
}

// Authed - every challenge the signed-in user is involved in (as creator or
// opponent), across all games, newest first - lets them find one they
// haven't shared yet (or shared but the friend hasn't accepted) to re-share it.
export function getMyChallenges(): Promise<Challenge[]> {
  return authedFetch("/challenges/mine");
}

// Admin-only - every challenge (pending/active/resolved/cancelled), newest first.
export function getAdminChallenges(): Promise<Challenge[]> {
  return authedFetch("/admin/challenges");
}

export function resolveChallenge(
  id: number | string,
  winnerUid: string,
): Promise<{ ok: boolean }> {
  return authedFetch(
    `/admin/challenges/${encodeURIComponent(String(id))}/resolve`,
    {
      method: "POST",
      body: JSON.stringify({ winnerUid }),
    },
  );
}

export function cancelChallenge(
  id: number | string,
  reason?: string,
): Promise<{ ok: boolean }> {
  return authedFetch(
    `/admin/challenges/${encodeURIComponent(String(id))}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ reason: reason || null }),
    },
  );
}

// Admin-only - sets the optional yes/no bonus question for a game (null/empty removes it).
export function setGameBonusQuestion(
  gameId: string,
  question: string | null,
): Promise<{ ok: boolean; question: string | null }> {
  return authedFetch(
    `/admin/games/${encodeURIComponent(gameId)}/bonus-question`,
    {
      method: "PUT",
      body: JSON.stringify({ question }),
    },
  );
}

export interface GameVideo {
  id: number;
  title: string;
  youtube: string;
  duration?: string | null;
}

// Admin-only - attaches a YouTube clip to a game.
export function addGameVideo(
  gameId: string,
  video: { title: string; youtube: string; duration?: string },
): Promise<GameVideo> {
  return authedFetch(`/admin/games/${encodeURIComponent(gameId)}/videos`, {
    method: "POST",
    body: JSON.stringify(video),
  });
}

// Admin-only - removes a clip from a game.
export function deleteGameVideo(
  gameId: string,
  videoId: number,
): Promise<{ ok: boolean }> {
  return authedFetch(
    `/admin/games/${encodeURIComponent(gameId)}/videos/${videoId}`,
    { method: "DELETE" },
  );
}

// Authed - cancelled challenges involving the signed-in user that they
// haven't been shown a notice for yet - checked once per app load.
export function getUnseenCancellations(): Promise<Challenge[]> {
  return authedFetch("/challenges/unseen-cancellations");
}

export function acknowledgeCancellation(
  id: number | string,
): Promise<{ ok: boolean }> {
  return authedFetch(
    `/challenges/${encodeURIComponent(String(id))}/acknowledge-cancellation`,
    { method: "POST" },
  );
}
