// Deploys ONE subfolder of a shared Firebase Hosting site without touching the rest.
//
// A normal `firebase deploy` replaces the WHOLE site with the contents of the local
// `dist`. letscoach.net hosts several apps (the main LetsCoach app, /mhaifafc/,
// /hapoel-jerusalem/), so a normal deploy from this repo would delete the others.
// Instead: copy the live version's file list (paths + hashes), swap only the
// files under /<SUBPATH>/ for the freshly built ones, and release that.
//
// Env: ACCESS_TOKEN, SITE, SUBPATH, DIST_DIR; optional CHANNEL (default "live"),
// PREVIEW_TTL (for non-live channels), QUOTA_PROJECT (needed for user tokens), DRY_RUN=1.
import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";

const {
  ACCESS_TOKEN,
  SITE,
  SUBPATH,
  DIST_DIR,
  CHANNEL = "live",
  PREVIEW_TTL = "86400s",
  QUOTA_PROJECT,
  DRY_RUN,
} = process.env;

for (const [k, v] of Object.entries({ ACCESS_TOKEN, SITE, SUBPATH, DIST_DIR })) {
  if (!v) throw new Error(`Missing env var ${k}`);
}
if (!/^[a-z0-9][a-z0-9-]*$/i.test(SUBPATH)) throw new Error("SUBPATH must be a single folder name");

const API = "https://firebasehosting.googleapis.com/v1beta1";
const prefix = `/${SUBPATH}/`;

async function api(method, url, body, { allow404 = false } = {}) {
  const res = await fetch(url.startsWith("http") ? url : `${API}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(QUOTA_PROJECT ? { "x-goog-user-project": QUOTA_PROJECT } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (allow404 && res.status === 404) return null;
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

// 1. What is live right now (always the basis, whichever channel we release to).
const live = await api("GET", `/sites/${SITE}/channels/live`);
const liveVersionName = live.release?.version?.name;
if (!liveVersionName) throw new Error("Could not find the live version");
const liveVersion = await api("GET", `/${liveVersionName}`);

const liveFiles = [];
let pageToken = "";
do {
  const page = await api(
    "GET",
    `/${liveVersionName}/files?pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ""}`,
  );
  liveFiles.push(...(page.files ?? []));
  pageToken = page.nextPageToken ?? "";
} while (pageToken);

const outside = liveFiles.filter((f) => !f.path.startsWith(prefix));
const inside = liveFiles.filter((f) => f.path.startsWith(prefix));
if (!outside.some((f) => f.path === "/index.html")) {
  throw new Error("Live site has no /index.html outside the subpath - refusing to continue");
}

// 2. The new files for the subpath.
const newFiles = new Map(); // path -> { hash, gz }
for (const abs of walk(DIST_DIR)) {
  const rel = abs.slice(DIST_DIR.length + 1).split(sep).join("/");
  const gz = gzipSync(readFileSync(abs), { level: 9 });
  newFiles.set(prefix + rel, { hash: createHash("sha256").update(gz).digest("hex"), gz });
}
if (!newFiles.has(`${prefix}index.html`)) throw new Error(`DIST_DIR has no index.html`);

console.log(`Live site: ${liveFiles.length} files (${outside.length} outside /${SUBPATH}/, ${inside.length} inside)`);
console.log(`New build: ${newFiles.size} files for /${SUBPATH}/`);
console.log(`Everything outside /${SUBPATH}/ is carried over unchanged.`);
if (DRY_RUN) {
  console.log("DRY_RUN - nothing was changed.");
  process.exit(0);
}

// 3. Assemble the new version: carried-over files + new subpath files.
const files = {};
for (const f of outside) files[f.path] = f.hash;
for (const [path, { hash }] of newFiles) files[path] = hash;

const version = await api("POST", `/sites/${SITE}/versions`, { config: liveVersion.config ?? {} });
const populate = await api("POST", `/${version.name}:populateFiles`, { files });

const byHash = new Map([...newFiles.values()].map((f) => [f.hash, f.gz]));
for (const hash of populate.uploadRequiredHashes ?? []) {
  const gz = byHash.get(hash);
  if (!gz) throw new Error(`Hosting needs content for ${hash}, which is not part of the new build - aborting`);
  const res = await fetch(`${populate.uploadUrl}/${hash}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/octet-stream",
      ...(QUOTA_PROJECT ? { "x-goog-user-project": QUOTA_PROJECT } : {}),
    },
    body: gz,
  });
  if (!res.ok) throw new Error(`Upload of ${hash} failed: ${res.status} ${await res.text()}`);
}
console.log(`Uploaded ${(populate.uploadRequiredHashes ?? []).length} new file(s).`);

await api("PATCH", `/${version.name}?update_mask=status`, { status: "FINALIZED" });

// 4. Release it.
if (CHANNEL !== "live") {
  const existing = await api("GET", `/sites/${SITE}/channels/${CHANNEL}`, null, { allow404: true });
  if (!existing) await api("POST", `/sites/${SITE}/channels?channelId=${CHANNEL}`, { ttl: PREVIEW_TTL });
}
await api("POST", `/sites/${SITE}/channels/${CHANNEL}/releases?versionName=${version.name}`, {
  message: `Deploy /${SUBPATH}/ via GitHub Actions`,
});
const channel = await api("GET", `/sites/${SITE}/channels/${CHANNEL}`);
console.log(`Released to channel "${CHANNEL}": ${channel.url}`);
