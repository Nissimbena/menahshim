import type { Player } from "./types";

/**
 * Player photos for the 2026-27 roster.
 *
 * Primary: the official BKT EuroCup cut-outs (transparent PNG, 750x1000,
 * identical framing for every player) from the club's EuroCup roster page.
 * Fallback: the club's own media-day photos from hapoel.co.il/team, used
 * where EuroCup only has a silhouette (Lorenzo Brown).
 *
 * Keyed by the player's name as stored in the `players` table (Hebrew).
 * A photoUrl coming from the database is used for anyone not listed here.
 *
 * Cleaner long-term home for these: the players.photoUrl column, so the
 * roster and its photos live in one place.
 */
const EUROCUP = "https://media-cdn.cortextech.io/1dU3kpCqReRp93/1BSdBWIjCjnOS5/";
const CLUB = "https://basket.co.il/pics/2026-2027/%D7%9E%D7%93%D7%99%D7%94%20%D7%93%D7%99%D7%99%20%D7%94%D7%A4%D7%95%D7%A2%D7%9C%20%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D/";

export interface PlayerPhoto {
  url: string;
  /** Transparent studio cut-out (sits on any background) vs. a photo with its own backdrop. */
  cutout: boolean;
}

const PHOTOS: Record<string, PlayerPhoto> = {
  "ג'ארד הארפר": { url: `${EUROCUP}fa87e748-14bd-432e-98d2-aaf6ab2c6d9b.png`, cutout: true },
  "ג'יילן סמית'": { url: `${EUROCUP}9868d08a-f4a4-4785-9df3-b45239b5db34.png`, cutout: true },
  "שחר לוברבוים": { url: `${EUROCUP}8fc39710-97b6-4c1e-9c17-44bf82c265bb.png`, cutout: true },
  "שייק מילטון": { url: `${EUROCUP}69d6e851-c161-4f7c-89b8-275e238ad200.png`, cutout: true },
  "רועי הובר": { url: `${EUROCUP}a1142084-bfa6-4d67-b35e-9d4deef77dce.png`, cutout: true },
  "איתן בורג": { url: `${EUROCUP}d15be71a-7fff-4d35-8cb6-b73d7bdd78fa.png`, cutout: true },
  "יובל זוסמן": { url: `${EUROCUP}32599150-9e8c-472c-8765-ab8d8bcd2c76.png`, cutout: true },
  "קנת' לופטון ג'וניור": { url: `${EUROCUP}adc66baa-c97f-447c-984e-a09f64728a54.png`, cutout: true },
  "נמרוד לוי": { url: `${EUROCUP}98f25115-5478-44cc-9ffb-a2baf12a0cef.png`, cutout: true },
  "דייויד רודי": { url: `${EUROCUP}79caccff-92d6-421d-8cad-680be28b5ffe.png`, cutout: true },
  "דבונטה קייקוק": { url: `${EUROCUP}7b733f2d-d21b-4011-8220-586be46b46b1.png`, cutout: true },
  "יותם חנוכי": { url: `${EUROCUP}580b42ea-596c-4b63-8be8-db2b960c2366.png`, cutout: true },
  "דושאן מילטיץ'": { url: `${EUROCUP}6a70d44e-84b3-4679-bcff-9295f42803a9.png`, cutout: true },
  "גבריאל צאצאשוילי": { url: `${EUROCUP}c4ee0b1f-b9a4-4116-85bd-8576fcabb53e.png`, cutout: true },
  "לורנזו בראון": { url: `${CLUB}%D7%9C%D7%95%D7%A8%D7%A0%D7%96%D7%95%20copy.png`, cutout: false },
};

/** Best available photo for a player, or null (the UI then shows initials). */
export function playerPhoto(player: Pick<Player, "name" | "photoUrl"> | null | undefined): PlayerPhoto | null {
  if (!player) return null;
  const known = PHOTOS[player.name];
  if (known) return known;
  return player.photoUrl ? { url: player.photoUrl, cutout: false } : null;
}
