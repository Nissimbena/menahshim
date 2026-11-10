import posthog from "posthog-js";

// The project API key is a public, send-only key (it is visible in any site's HTML), so it lives in the code.
const KEY = import.meta.env.VITE_POSTHOG_KEY || "phc_trXq3bZVdRdu24va4Xxx2G8navAtzrEozFzmzhXPpEcm";
const HOST = "https://eu.i.posthog.com";

let started = false;

/** Starts PostHog (EU cloud). Not in dev, so local testing never pollutes the data. */
export function initAnalytics(app: string, team?: string) {
  if (started || import.meta.env.DEV) return;
  started = true;
  posthog.init(KEY, {
    api_host: HOST,
    ui_host: "https://eu.posthog.com",
    // Only explicit events below: no click/text autocapture (it could pick up nicknames) and no replays.
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
    // Visitors who never sign in stay anonymous events, no person profile.
    person_profiles: "identified_only",
  });
  posthog.register({ app, ...(team ? { team } : {}) });
  posthog.capture("app_opened");
}

/** Ties events to the Firebase uid only - no email or name is sent. */
export function identifyUser(uid: string) {
  if (started) posthog.identify(uid);
}

export function resetUser() {
  if (started) posthog.reset();
}

export function track(event: string, props?: Record<string, string | number | boolean | null>) {
  if (started) posthog.capture(event, props);
}
