import { LOGO } from "./logoPaths";
import { GAME_TITLE } from "../config/GameConfig";

/**
 * The "מנאחסים" logo as inline SVG. The ס is a basketball (red circle, seams
 * knocked out), built from the real Tel Aviv Modernist Bold outlines by
 * scripts/build-logo.py - so it renders identically before the webfont loads.
 *
 * Colors come from CSS: letters use currentColor (set --text on the parent),
 * the ball uses var(--red). `mono` renders the ball in currentColor too.
 */

let maskCounter = 0;

function seamsMarkup(stroke: string, width: number): string {
  return `<g fill="none" stroke="${stroke}" stroke-width="${width}">${LOGO.seams
    .map((d) => `<path d="${d}"/>`)
    .join("")}</g>`;
}

export function logoSVG(
  opts: { variant?: "color" | "mono"; className?: string } = {},
): string {
  const id = `logo-ball-${++maskCounter}`;
  const ballFill = opts.variant === "mono" ? "currentColor" : "var(--red)";
  const { cx, cy, r } = LOGO.ball;
  return `<svg class="logo ${opts.className ?? ""}" viewBox="${LOGO.viewBox}" role="img" aria-label="${GAME_TITLE}" focusable="false">
    <mask id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="white"/>${seamsMarkup("black", LOGO.seamWidth)}</mask>
    <path fill="currentColor" d="${LOGO.letters}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${ballFill}" mask="url(#${id})"/>
  </svg>`;
}

/** The ball on its own - app icon, loading and "sent" animations. */
export function logoMarkSVG(opts: { className?: string; label?: string } = {}): string {
  const id = `logo-mark-${++maskCounter}`;
  const { cx, cy, r } = LOGO.ball;
  const vb = `${cx - r} ${cy - r} ${r * 2} ${r * 2}`;
  const a11y = opts.label
    ? `role="img" aria-label="${opts.label}"`
    : 'aria-hidden="true"';
  return `<svg class="logo-mark ${opts.className ?? ""}" viewBox="${vb}" ${a11y} focusable="false">
    <mask id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="white"/>${seamsMarkup("black", LOGO.seamWidth)}</mask>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--red)" mask="url(#${id})"/>
  </svg>`;
}
