import type { Player } from "./types";

/**
 * The Hapoel Jerusalem roster (name, jersey number, position, citizenship)
 * lives in the `players` table in Cloud SQL, not here - see
 * HapoelJerusalemBackend's `GET /players` endpoint and `seed_players.py`.
 * Fetch it at runtime via `getPlayers()` in `../api/backend`.
 */
export type { Player };
