/**
 * Match photography (club photographer, 2026/27). Portrait frames, so every
 * slot crops them with `object-fit: cover`; `pos` keeps the player's face in
 * frame whatever the slot's shape.
 *
 * All photos are shown with the same treatment (see `.photo` in style.css):
 * black & white over Hapoel's deep red, so arena blues never fight the brand.
 */
export interface ActionPhoto {
  src: string;
  /** object-position - the player's head, roughly */
  pos: string;
}

export const ACTION_PHOTOS: ActionPhoto[] = [
  { src: "photos/action/action-1.webp", pos: "66% 22%" },
  { src: "photos/action/action-2.webp", pos: "48% 20%" },
  { src: "photos/action/action-3.webp", pos: "45% 18%" },
  { src: "photos/action/action-4.webp", pos: "50% 14%" },
  { src: "photos/action/action-5.webp", pos: "45% 14%" },
  { src: "photos/action/action-6.webp", pos: "60% 10%" },
  { src: "photos/action/action-7.webp", pos: "42% 30%" },
];

/** Same seed, same photo - a game keeps its picture across screens and visits. */
export function actionPhoto(seed: string): ActionPhoto {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ACTION_PHOTOS[h % ACTION_PHOTOS.length];
}

/** The toned photo layer; drop it as the first child of a positioned block. */
export function photoLayer(seed: string, className = ""): string {
  const p = actionPhoto(seed);
  return `<div class="photo ${className}" aria-hidden="true"><img src="${p.src}" alt="" style="object-position:${p.pos}" decoding="async" /></div>`;
}
