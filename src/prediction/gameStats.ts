import type { Player } from "./types";
import type { GameResultData } from "../api/backend";
import type { GameBoxScore, BoxScoreLine } from "../config/boxscores";
import { t, tDynamic } from "../i18n/i18n";
import { icon, type IconName } from "../ui/icons";
import { el, esc } from "../ui/dom";
import { playerMedia, playerNameHTML, CATEGORY_ICON } from "./recap";
import { CATEGORY_ORDER, CATEGORY_CONFIG } from "./scoring";

/**
 * "Team stats" for a finished game:
 *  1. team totals as four tiles (points, threes, rebounds, assists)
 *  2. the three game leaders as photo cards
 *  3. the full player box score, when one exists for the game
 */
export function teamStatsSection(opts: {
  result: GameResultData;
  teamScore: number | null;
  box: GameBoxScore | null;
  playerById: (id: string) => Player | undefined;
}): HTMLElement {
  const { result: r, box, playerById } = opts;
  const section = el("div", "team-stats");

  // 1. Totals
  const tiles: [IconName, string, number | null][] = [
    ["statScore", t("gameStats.points"), opts.teamScore],
    ["statThrees", t("prediction.teamStep.threes"), r.actualTeamThrees],
    ["statTeamRebounds", t("prediction.teamStep.rebounds"), r.actualTeamRebounds],
    ["statTeamAssists", t("prediction.teamStep.assists"), r.actualTeamAssists],
  ];
  const totals = el("ul", "team-stats__totals");
  totals.setAttribute("aria-label", t("gameStats.totals"));
  tiles.forEach(([ic, label, v]) => {
    totals.appendChild(
      el(
        "li",
        "stat-tile",
        `<span class="stat-tile__icon">${icon(ic)}</span>
         <span class="stat-tile__value num--display">${v ?? "–"}</span>
         <span class="stat-tile__label">${esc(label)}</span>`,
      ),
    );
  });
  section.appendChild(totals);

  // 2. Leaders
  const leaders = el("div", "team-stats__leaders");
  leaders.innerHTML = `<h3 class="team-stats__sub">${t("gameStats.leaders")}</h3>`;
  const list = el("ul", "leader-cards");
  CATEGORY_ORDER.forEach((cat) => {
    const config = CATEGORY_CONFIG[cat];
    const id = r[config.actualPlayerKey];
    const value = r[config.actualAmountKey];
    if (!id) return;
    const player = playerById(id);
    list.appendChild(
      el(
        "li",
        "leader-card",
        `<span class="leader-card__media">${playerMedia(player, "lg")}</span>
         <span class="leader-card__body">
           <span class="leader-card__stat">${icon(CATEGORY_ICON[cat], { size: "sm" })}${esc(t(config.labelKey))}</span>
           ${player ? playerNameHTML(player) : ""}
           <span class="leader-card__value"><span class="num--display">${value ?? "–"}</span><span>${esc(t(config.amountLabelKey))}</span></span>
         </span>`,
      ),
    );
  });
  leaders.appendChild(list);
  section.appendChild(leaders);

  // 3. Box score
  if (box && box.players.length) section.appendChild(boxScoreTable(box, playerById));
  return section;
}

const COLS: { key: keyof BoxScoreLine; labelKey: string; numeric: boolean }[] = [
  { key: "min", labelKey: "gameStats.col.min", numeric: false },
  { key: "pts", labelKey: "gameStats.col.pts", numeric: true },
  { key: "reb", labelKey: "gameStats.col.reb", numeric: true },
  { key: "ast", labelKey: "gameStats.col.ast", numeric: true },
  { key: "stl", labelKey: "gameStats.col.stl", numeric: true },
  { key: "blk", labelKey: "gameStats.col.blk", numeric: true },
  { key: "tov", labelKey: "gameStats.col.tov", numeric: true },
  { key: "fg", labelKey: "gameStats.col.fg", numeric: false },
  { key: "three", labelKey: "gameStats.col.three", numeric: false },
  { key: "ft", labelKey: "gameStats.col.ft", numeric: false },
];

/** A real <table>: sticky player column, scrolls sideways on phones, best value per column marked. */
function boxScoreTable(box: GameBoxScore, playerById: (id: string) => Player | undefined): HTMLElement {
  const wrap = el("div", "box-score");
  wrap.innerHTML = `<h3 class="team-stats__sub" id="box-score-title">${t("gameStats.boxScore")}</h3>`;
  const scroller = el("div", "box-score__scroll");
  scroller.tabIndex = 0;
  scroller.setAttribute("role", "region");
  scroller.setAttribute("aria-labelledby", "box-score-title");

  const cols = COLS.filter((c) => box.players.some((p) => p[c.key] !== undefined));
  const rows = box.players.slice().sort((a, b) => b.pts - a.pts);
  const best: Record<string, number> = {};
  cols.forEach((c) => {
    if (c.numeric) best[c.key] = Math.max(...rows.map((p) => Number(p[c.key] ?? 0)));
  });

  const head = cols.map((c) => `<th scope="col" abbr="${esc(t(c.labelKey + "Full"))}">${esc(t(c.labelKey))}</th>`).join("");
  const body = rows
    .map((line) => {
      const p = playerById(line.playerId);
      const name = p ? tDynamic(p.name) : line.playerId;
      const cells = cols
        .map((c) => {
          const v = line[c.key];
          const top = c.numeric && v !== undefined && Number(v) > 0 && Number(v) === best[c.key];
          return `<td${top ? ' class="is-top"' : ""}>${v === undefined ? "–" : esc(String(v))}</td>`;
        })
        .join("");
      return `<tr>
        <th scope="row"><span class="box-score__player">${playerMedia(p, "sm")}<span><span class="box-score__num">${p ? `#${p.jerseyNumber}` : ""}</span> <span dir="auto">${esc(name)}</span></span></span></th>
        ${cells}
      </tr>`;
    })
    .join("");
  const totals = cols
    .map((c) => {
      if (c.key === "min") return "<td></td>";
      if (c.numeric) return `<td>${rows.reduce((s, p) => s + Number(p[c.key] ?? 0), 0)}</td>`;
      const sum = rows.reduce(
        (acc, p) => {
          const [m, a] = String(p[c.key] ?? "0-0").split("-").map(Number);
          return [acc[0] + (m || 0), acc[1] + (a || 0)];
        },
        [0, 0],
      );
      const pct = sum[1] ? Math.round((sum[0] / sum[1]) * 100) : 0;
      return `<td>${sum[0]}-${sum[1]} <span class="box-score__pct">${pct}%</span></td>`;
    })
    .join("");

  scroller.innerHTML = `<table class="box-score__table">
      <thead><tr><th scope="col">${t("gameStats.col.player")}</th>${head}</tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><th scope="row">${t("gameStats.total")}</th>${totals}</tr></tfoot>
    </table>`;
  wrap.appendChild(scroller);
  return wrap;
}
