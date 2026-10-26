/**
 * Inline SVG icons. Line icons follow Lucide (ISC license, lucide.dev) at a
 * 24px grid and a 1.5px stroke; sport balls are drawn to match. Icons
 * inherit the current text color.
 */

const PATHS = {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  chart: '<path d="M5 21v-6"/><path d="M12 21V3"/><path d="M19 21V9"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  arrowBack: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  arrowForward: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  chevronForward: '<path d="m9 18 6-6-6-6"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  instagram: '<rect width="20" height="20" x="2" y="2" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="0.9" fill="currentColor" stroke="none"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  headphones: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/>',
  sliders: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  logIn: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  // Sport balls
  basketball: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2v20"/><path d="M5 4.9a10 10 0 0 1 0 14.2"/><path d="M19 4.9a10 10 0 0 0 0 14.2"/>',
  football: '<circle cx="12" cy="12" r="10"/><path d="m12 7.5 4 2.9-1.5 4.7h-5l-1.5-4.7z"/><path d="M12 7.5V2.2"/><path d="m16 10.4 5-1.6"/><path d="m14.5 15.1 3 4.2"/><path d="m9.5 15.1-3 4.2"/><path d="M8 10.4 3 8.8"/>',
  rugby: '<ellipse cx="12" cy="12" rx="10.5" ry="6.5" transform="rotate(-45 12 12)"/><path d="m8.5 15.5 7-7"/><path d="m10.2 11.8 2 2"/><path d="m11.8 10.2 2 2"/>',
  handball: '<circle cx="12" cy="12" r="10"/><path d="M12 2c-3.2 3-3.2 17 0 20"/><path d="M12 2c3.2 3 3.2 17 0 20"/><path d="M2.6 8.5h18.8"/><path d="M2.6 15.5h18.8"/>',
  volleyball: '<path d="M11.1 7.1a16.55 16.55 0 0 1 10.9 4"/><path d="M12 12a12.6 12.6 0 0 1-8.7 5"/><path d="M16.8 13.6a16.55 16.55 0 0 1-9 7.5"/><path d="M20.7 17a12.8 12.8 0 0 0-8.7-5 13.3 13.3 0 0 1 0-10"/><path d="M6.3 3.8a16.55 16.55 0 0 0 1.9 11.5"/><circle cx="12" cy="12" r="10"/>',
  tennis: '<circle cx="12" cy="12" r="10"/><path d="M6 5.3a9 9 0 0 1 0 13.4"/><path d="M18 5.3a9 9 0 0 0 0 13.4"/>',
  // Basketball stat icons (drawn on the same 24px grid / 1.5px stroke)
  /** Points: ball dropping through the rim */
  statPoints: '<circle cx="12" cy="6" r="4"/><path d="M8.3 4.6 15.7 7.4"/><path d="M4 12.5h16"/><path d="m6 12.5 1.6 8.5h8.8l1.6-8.5"/><path d="m9.5 12.5.8 8.5"/><path d="m14.5 12.5-.8 8.5"/>',
  /** Rebounds: ball coming off the backboard, caught on the way down */
  statRebounds: '<path d="M3 3v9"/><path d="M3 7.5h4"/><circle cx="15.5" cy="16.5" r="4"/><path d="M7 7.5c4.5-.5 8 1.5 9.5 5"/><path d="m13.6 10.4 3 2.3.7-3.7"/>',
  /** Assists: the pass - ball travelling from one hand to the next */
  statAssists: '<circle cx="5" cy="17" r="3"/><circle cx="19" cy="7" r="3"/><path d="M8 15.5c3.5-1.2 6.2-3.6 8-6.5"/><path d="m12.4 9.1 3.6-.1.3 3.6"/>',
  /** Three-pointers: the arc with the corner lines */
  statThrees: '<path d="M3 21V12a9 9 0 0 1 18 0v9"/><path d="M12 21v-3"/><circle cx="12" cy="13" r="2.2"/>',
  /** Final score: a two-sided scoreboard */
  statScore: '<rect x="2.5" y="5" width="19" height="14" rx="1.5"/><path d="M12 5v14"/><path d="M6 10h2.5v4H6"/><path d="M15.5 10h2.5v4h-2.5"/><path d="M15.5 12h2.5"/>',
  /** Team rebounds (whole team) */
  statTeamRebounds: '<path d="M3 3v9"/><path d="M3 7.5h4"/><circle cx="16" cy="16" r="4"/><path d="M7 7.5c4.5-.5 8 1.5 9.5 4.5"/><path d="M9 21h12"/>',
  /** Team assists (ball movement) */
  statTeamAssists: '<circle cx="4.5" cy="18" r="2.5"/><circle cx="12" cy="6" r="2.5"/><circle cx="19.5" cy="18" r="2.5"/><path d="M6 15.8 10.5 8.3"/><path d="M13.5 8.3 18 15.8"/><path d="M7 18h10" stroke-dasharray="2 2"/>',
  /** Bonus question */
  statBonus: '<path d="M12 2.5 14.6 8l6 .7-4.4 4.1 1.2 5.9L12 15.8l-5.4 2.9 1.2-5.9L3.4 8.7l6-.7z"/>',
} as const;

export type IconName = keyof typeof PATHS | "whatsapp";

/** Icons that point "forward"/"back" and must mirror in RTL. */
const DIRECTIONAL = new Set<IconName>(["arrowBack", "arrowForward", "chevronForward"]);

const WHATSAPP_PATH =
  "M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 438.9c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.8-186.6 184.8zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z";

export function icon(
  name: IconName,
  opts: { size?: "sm" | "lg"; className?: string; label?: string } = {},
): string {
  const classes = ["icon"];
  if (opts.size) classes.push(`icon--${opts.size}`);
  if (DIRECTIONAL.has(name)) classes.push("icon--dir");
  if (opts.className) classes.push(opts.className);
  const a11y = opts.label
    ? `role="img" aria-label="${opts.label}"`
    : 'aria-hidden="true" focusable="false"';
  if (name === "whatsapp") {
    classes.push("icon--fill");
    return `<svg class="${classes.join(" ")}" viewBox="0 0 448 512" ${a11y}><path d="${WHATSAPP_PATH}"/></svg>`;
  }
  return `<svg class="${classes.join(" ")}" viewBox="0 0 24 24" ${a11y}>${PATHS[name]}</svg>`;
}

/** Ball icon for a sports-hub sport id (falls back to a generic ball). */
export function sportIcon(sportId: string, size?: "sm" | "lg"): string {
  const known: Record<string, IconName> = {
    basketball: "basketball",
    football: "football",
    rugby: "rugby",
    handball: "handball",
    volleyball: "volleyball",
    tennis: "tennis",
  };
  return icon(known[sportId] ?? "basketball", { size });
}
