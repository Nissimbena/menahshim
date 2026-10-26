export const GAME_TITLE = "מנאחסים";

// Brand colors live in src/styles/tokens.css (--red etc.), not here.

/** The game-discussion WhatsApp group (footer card + "More" menu). */
export const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/FEvheh8S3HZ89MYEFLj1qm";

// Temporarily disabled per explicit request (2026-10-14) - hides the feature
// from regular users (no create-challenge button, no "My Challenges" menu
// item) without touching any backend data or the admin panel, which keeps
// managing existing challenges as before. Flip back to true to re-enable.
export const CHALLENGE_FEATURE_ENABLED = false;

// The multi-sport hub is local-only for now (explicit request) - keep this
// false in anything that gets deployed; flip to true only for local dev.
export const SPORTS_HUB_ENABLED = false;
