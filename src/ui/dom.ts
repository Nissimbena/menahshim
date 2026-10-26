import { TEAMS, HAPOEL_JERUSALEM_TEAM_ID, type Team } from "../schedule/teams";
import type { ScheduleGame } from "../schedule/schedule";

/** Escapes user/DB-provided text before it goes into an innerHTML template. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Tiny element factory: el("div", "card", "<p>…</p>") */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  html?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

/** Up to two initials for an avatar placeholder (works for Hebrew and Latin). */
export function initials(name: string | null | undefined): string {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const second = parts.length > 1 ? (Array.from(parts[1])[0] ?? "") : "";
  return (first + second).toUpperCase();
}

/** Avatar markup: photo if there is one, otherwise initials. */
export function avatarHTML(
  name: string | null | undefined,
  photoUrl?: string | null,
  className = "",
): string {
  return `<span class="avatar ${className}">${
    photoUrl
      ? `<img src="${esc(photoUrl)}" alt="" referrerpolicy="no-referrer" />`
      : esc(initials(name))
  }</span>`;
}

/** The team Hapoel Jerusalem is playing in this game, plus whether it's a home game. */
export function opponentOf(game: ScheduleGame): { team: Team | undefined; isHome: boolean } {
  const isHome = game.homeTeamId === HAPOEL_JERUSALEM_TEAM_ID;
  return { team: TEAMS[isHome ? game.awayTeamId : game.homeTeamId], isHome };
}

/** "26/10/2026" -> "26/10" */
export function shortDate(ddmmyyyy: string): string {
  const [d, m] = ddmmyyyy.split("/");
  return d && m ? `${d}/${m}` : ddmmyyyy;
}

/** Wraps LTR runs (scores, clocks) so they don't reorder inside RTL text. */
export function ltr(text: string | number): string {
  return `⁦${text}⁩`;
}
