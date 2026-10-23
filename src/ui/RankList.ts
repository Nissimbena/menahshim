import type { LeaderboardRow } from "../api/backend";
import { t } from "../i18n/i18n";
import { el, esc, avatarHTML } from "./dom";
import { icon } from "./icons";

/**
 * One ranking component for every table in the app (overall, per game,
 * leagues, VIP tournament, home preview): optional podium for the top three,
 * then rows with a fixed-width rank column. The signed-in user's row is
 * tinted red and sticks to the bottom of the viewport while it's off-screen.
 */
export function rankList(
  rows: LeaderboardRow[],
  opts: {
    meUid?: string | null;
    podium?: boolean;
    limit?: number;
    /** When the list is cut by `limit`, still append the user's own row. */
    appendMe?: boolean;
    onRowClick?: (row: LeaderboardRow) => void;
    compact?: boolean;
  } = {},
): HTMLElement {
  const wrap = el("div", "ranking");
  const usePodium = !!opts.podium && rows.length >= 3;
  const start = usePodium ? 3 : 0;

  if (usePodium) wrap.appendChild(podium(rows.slice(0, 3), opts));

  const limit = opts.limit ?? rows.length;
  const visible = rows.slice(start, Math.max(start, limit));
  const meIndex = opts.meUid ? rows.findIndex((r) => r.uid === opts.meUid) : -1;

  if (visible.length > 0 || (opts.appendMe && meIndex >= limit)) {
    const list = el("ol", `list rank-list${opts.compact ? " rank-list--compact" : ""}`);
    list.start = start + 1;
    visible.forEach((row, i) => list.appendChild(rankRow(row, start + i, opts)));
    if (opts.appendMe && meIndex >= limit) {
      list.appendChild(el("li", "rank-gap", "<span>⋯</span>"));
      list.appendChild(rankRow(rows[meIndex], meIndex, opts));
    }
    wrap.appendChild(list);
  }
  return wrap;
}

function rankRow(
  row: LeaderboardRow,
  index: number,
  opts: { meUid?: string | null; onRowClick?: (row: LeaderboardRow) => void },
): HTMLElement {
  const isMe = !!opts.meUid && row.uid === opts.meUid;
  const li = el("li", `rank-item${isMe ? " is-me" : ""}`);
  const inner = opts.onRowClick ? el("button", "list-row rank-row") : el("div", "list-row rank-row");
  if (inner instanceof HTMLButtonElement) {
    inner.type = "button";
    inner.addEventListener("click", () => opts.onRowClick?.(row));
  }
  inner.innerHTML = `
    <span class="rank-row__pos num${index === 0 ? " is-first" : ""}">${index + 1}</span>
    ${avatarHTML(row.name)}
    <span class="rank-row__name" dir="auto">${esc(row.name)}${isMe ? ` <span class="tag tag--red">${t("leaderboard.you")}</span>` : ""}</span>
    <span class="rank-row__score num">${row.total}</span>
    ${opts.onRowClick ? icon("chevronForward", { size: "sm", className: "c-3" }) : ""}
  `;
  li.appendChild(inner);
  return li;
}

function podium(
  top: LeaderboardRow[],
  opts: { meUid?: string | null; onRowClick?: (row: LeaderboardRow) => void },
): HTMLElement {
  // Visual order 2 · 1 · 3 so first place stands in the middle, raised.
  const order = [1, 0, 2];
  const box = el("div", "podium");
  order.forEach((i) => {
    const row = top[i];
    const isMe = !!opts.meUid && row.uid === opts.meUid;
    const step = opts.onRowClick ? el("button", "podium__step") : el("div", "podium__step");
    step.classList.add(`podium__step--${i + 1}`);
    if (isMe) step.classList.add("is-me");
    if (step instanceof HTMLButtonElement) {
      step.type = "button";
      step.addEventListener("click", () => opts.onRowClick?.(row));
    }
    step.innerHTML = `
      ${i === 0 ? `<span class="podium__crown">${icon("trophy", { size: "sm" })}</span>` : ""}
      ${avatarHTML(row.name, null, "avatar--lg")}
      <span class="podium__name" dir="auto">${esc(row.name)}</span>
      <span class="podium__score num">${row.total}</span>
      <span class="podium__block"><span class="podium__pos num">${i + 1}</span></span>
    `;
    box.appendChild(step);
  });
  return box;
}
