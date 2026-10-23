// Minimal service worker - just enough to satisfy PWA installability
// requirements (Chrome's beforeinstallprompt needs a fetch handler
// registered). No offline caching strategy on purpose, to avoid serving
// stale app bundles after a deploy.
self.addEventListener("fetch", () => {});
