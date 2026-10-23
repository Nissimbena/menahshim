import type { LeaderboardRow } from "../api/backend";
import { t } from "../i18n/i18n";
import { el, esc, avatarHTML } from "./dom";
import { icon } from "./icons";

/**
 * One standings table for every ranking in the app (overall, per game,
 * leagues, VIP tournament, home preview): a column header, a fixed-width
 * rank column in scoreboard digits, the leader marked in gold, and the
 * signed-in user's row highlighted - it sticks to the bottom of the viewport
 * while it's off-screen on the full tables.
 */
export function rankList(
  rows: LeaderboardRow[],
  opts: {
    meUid?: string | null;
    limit?: number;
    /** When the list is cut by `limit`, still append the user's own row. */
    appendMe?: boolean;
    onRowClick?: (row: LeaderboardRow) => void;
    compact?: boolean;
  } = {},
): HTMLElement {
  const table = el("div", `standings${opts.compact ? " standings--compact" : ""}`);
  table.setAttribute("role", "table");

  const head = el(
    "div",
    "standings__head",
    `<span role="columnheader">${t("leaderboard.col.rank")}</span>
     <span role="columnheader">${t("leaderboard.col.player")}</span>
     <span role="columnheader" class="standings__pts-head">${t("leaderboard.col.points")}</span>`,
  );
  head.setAttribute("role", "row");
  table.appendChild(head);

  const limit = opts.limit ?? rows.length;
  const meIndex = opts.meUid ? rows.findIndex((r) => r.uid === opts.meUid) : -1;

  const list = el("ol", "standings__body");
  rows.slice(0, limit).forEach((row, i) => list.appendChild(rankRow(row, i, opts)));
  if (opts.appendMe && meIndex >= limit) {
    list.appendChild(el("li", "standings__gap", "<span aria-hidden=\"true\">⋯</span>"));
    list.appendChild(rankRow(rows[meIndex], meIndex, opts));
  }
  table.appendChild(list);
  return table;
}

function rankRow(
  row: LeaderboardRow,
  index: number,
  opts: { meUid?: string | null; onRowClick?: (row: LeaderboardRow) => void },
): HTMLElement {
  const isMe = !!opts.meUid && row.uid === opts.meUid;
  const li = el("li", `standings__item${isMe ? " is-me" : ""}${index === 0 ? " is-first" : ""}`);
  const inner = opts.onRowClick ? el("button", "standings__row") : el("div", "standings__row");
  inner.setAttribute("role", "row");
  if (inner instanceof HTMLButtonElement) {
    inner.type = "button";
    inner.addEventListener("click", () => opts.onRowClick?.(row));
  }
  inner.innerHTML = `
    <span class="standings__pos num" role="cell">${index + 1}</span>
    <span class="standings__player" role="cell">
      ${avatarHTML(row.name)}
      <span class="standings__name" dir="auto">${esc(row.name)}</span>
      ${isMe ? `<span class="tag tag--red">${t("leaderboard.you")}</span>` : ""}
    </span>
    <span class="standings__pts num" role="cell">${row.total}</span>
    ${opts.onRowClick ? icon("chevronForward", { size: "sm", className: "standings__chev" }) : ""}
  `;
  li.appendChild(inner);
  return li;
}
