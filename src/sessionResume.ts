import type { GamePrediction } from "./prediction/types";

const PREDICTION_KEY = "pendingPredictionSubmit";
const JOIN_CODE_KEY = "pendingJoinCode";

interface PendingPrediction {
  gameId: string;
  gameDate: string; // YYYY-MM-DD
  prediction: GamePrediction;
}

/**
 * Sign-in now navigates away (signInWithRedirect, more reliable than a
 * popup on Safari/iOS) - these helpers let a screen stash what it was
 * about to do just before redirecting, so main.ts can finish the action
 * once the user comes back signed in.
 */
export function savePendingPrediction(data: PendingPrediction) {
  sessionStorage.setItem(PREDICTION_KEY, JSON.stringify(data));
}

export function takePendingPrediction(): PendingPrediction | null {
  const raw = sessionStorage.getItem(PREDICTION_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PREDICTION_KEY);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function savePendingJoinCode(code: string) {
  sessionStorage.setItem(JOIN_CODE_KEY, code);
}

export function takePendingJoinCode(): string | null {
  const code = sessionStorage.getItem(JOIN_CODE_KEY);
  if (code) sessionStorage.removeItem(JOIN_CODE_KEY);
  return code;
}

const REDIRECT_PENDING_KEY = "authRedirectPending";

/**
 * Our OWN marker (independent of Firebase's internal state) set right
 * before calling signInWithRedirect. Needed because getRedirectResult()
 * can silently resolve to null (no error at all) when the browser loses
 * Firebase's pending-redirect state - without this marker, that case is
 * indistinguishable from "the user never tried to sign in".
 */
export function markRedirectSignInStarted() {
  sessionStorage.setItem(REDIRECT_PENDING_KEY, "1");
}

export function takeRedirectSignInWasPending(): boolean {
  const was = sessionStorage.getItem(REDIRECT_PENDING_KEY) === "1";
  sessionStorage.removeItem(REDIRECT_PENDING_KEY);
  return was;
}
