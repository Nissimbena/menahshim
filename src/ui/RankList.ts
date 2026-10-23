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

  // Full tables open with a podium for the top three; the list continues from 4th.
  const podium = !opts.compact && rows.length >= 3 && limit >= 3;

  const list = el("ol", "standings__body");
  if (podium) list.setAttribute("start", "4");
  rows.slice(podium ? 3 : 0, limit).forEach((row, j) => list.appendChild(rankRow(row, j + (podium ? 3 : 0), opts)));
  if (opts.appendMe && meIndex >= limit) {
    list.appendChild(el("li", "standings__gap", "<span aria-hidden=\"true\">⋯</span>"));
    list.appendChild(rankRow(rows[meIndex], meIndex, opts));
  }
  table.appendChild(list);
  if (!podium) return table;
  const wrap = el("div", "standings-wrap");
  wrap.append(podiumBlock(rows.slice(0, 3), opts), table);
  return wrap;
}

const MEDALS = ["gold", "silver", "bronze"] as const;

/** Medal disc with the place number - gold, silver, bronze; plain number after that. */
function posHTML(index: number): string {
  return index < 3
    ? `<span class="medal medal--${MEDALS[index]}" aria-label="${index + 1}">${index + 1}</span>`
    : `${index + 1}`;
}

/** 2nd | 1st | 3rd, the winner raised - the classic podium. */
function podiumBlock(
  top: LeaderboardRow[],
  opts: { meUid?: string | null; onRowClick?: (row: LeaderboardRow) => void },
): HTMLElement {
  const wrap = el("ol", "podium");
  wrap.setAttribute("aria-label", t("leaderboard.podium"));
  [1, 0, 2].forEach((i) => {
    const row = top[i];
    const isMe = !!opts.meUid && row.uid === opts.meUid;
    const li = el("li", `podium__place podium__place--${MEDALS[i]}${isMe ? " is-me" : ""}`);
    const card = opts.onRowClick ? el("button", "podium__card") : el("div", "podium__card");
    if (card instanceof HTMLButtonElement) {
      card.type = "button";
      card.addEventListener("click", () => opts.onRowClick?.(row));
    }
    card.innerHTML = `
      ${i === 0 ? `<span class="podium__crown">${icon("trophy")}</span>` : ""}
      <span class="medal medal--${MEDALS[i]} medal--lg">${i + 1}</span>
      ${avatarHTML(row.name)}
      <span class="podium__name" dir="auto">${esc(row.name)}</span>
      ${isMe ? `<span class="tag tag--red">${t("leaderboard.you")}</span>` : ""}
      <span class="podium__pts"><span class="num">${row.total}</span><span>${t("leaderboard.col.points")}</span></span>
      <span class="podium__step" aria-hidden="true"></span>`;
    li.appendChild(card);
    wrap.appendChild(li);
  });
  return wrap;
}

function rankRow(
  row: LeaderboardRow,
  index: number,
  opts: { meUid?: string | null; onRowClick?: (row: LeaderboardRow) => void },
): HTMLElement {
  const isMe = !!opts.meUid && row.uid === opts.meUid;
  const li = el(
    "li",
    `standings__item${isMe ? " is-me" : ""}${index < 3 ? ` is-top is-${MEDALS[index]}` : ""}`,
  );
  const inner = opts.onRowClick ? el("button", "standings__row") : el("div", "standings__row");
  inner.setAttribute("role", "row");
  if (inner instanceof HTMLButtonElement) {
    inner.type = "button";
    inner.addEventListener("click", () => opts.onRowClick?.(row));
  }
  inner.innerHTML = `
    <span class="standings__pos num" role="cell">${posHTML(index)}</span>
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
