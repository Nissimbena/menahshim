import type { Player, GamePrediction } from "./types";
import type { GameResultData, ScoringRules, PredictionsAggregate } from "../api/backend";
import type { ScheduleGame } from "../schedule/schedule";
import { BONUS_QUESTIONS } from "../schedule/schedule";
import { TEAMS, teamName, type Team } from "../schedule/teams";
import { t, tDynamic } from "../i18n/i18n";
import { icon, type IconName } from "../ui/icons";
import { el, esc, initials } from "../ui/dom";
import { playerPhoto } from "./playerPhotos";
import {
  CATEGORY_ORDER,
  CATEGORY_CONFIG,
  topStatPoints,
  finalScorePoints,
  teamStatPoints,
  type StatCategory,
} from "./scoring";

/**
 * Visual building blocks for showing a prediction:
 *  - predictionSlip: the "bet slip" before submitting / while waiting for the game
 *  - predictionCompare: predicted vs. actual after the game, EuroLeague
 *    "Game Leaders" style - a player cut-out on each side of every stat line
 *  - aggregateCard: how everyone else predicted
 * All point values come from the shared scoring helpers (no new logic here).
 */

export const CATEGORY_ICON: Record<StatCategory, IconName> = {
  scorer: "statPoints",
  rebounder: "statRebounds",
  assist: "statAssists",
};

export const TEAM_STAT_ICON = {
  predictedTeamThrees: "statThrees",
  predictedTeamRebounds: "statTeamRebounds",
  predictedTeamAssists: "statTeamAssists",
} as const satisfies Record<string, IconName>;

/** Player cut-out (or initials) - `size` picks the framing. */
// A photo that fails to load (moved CDN file, offline) falls back to the
// initials disc instead of a broken-image glyph.
if (typeof document !== "undefined") {
  document.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;
      const media = img.closest(".pmedia");
      if (!media) return;
      media.classList.remove("is-cutout");
      media.classList.add("pmedia--empty");
      img.remove();
    },
    true,
  );
}

export function playerMedia(player: Player | null | undefined, size: "sm" | "md" | "lg" = "md"): string {
  const photo = playerPhoto(player);
  const name = player ? tDynamic(player.name) : "";
  if (!photo) {
    return `<span class="pmedia pmedia--${size} pmedia--empty" aria-hidden="true"><span>${esc(player ? initials(name) : "?")}</span></span>`;
  }
  return `<span class="pmedia pmedia--${size}${photo.cutout ? " is-cutout" : ""}" aria-hidden="true"><img src="${esc(photo.url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" /></span>`;
}

/** "ג'ארד" + "הארפר" - first name light, the rest bold, the way rosters set it. */
export function playerNameHTML(player: Player | null | undefined, fallback = ""): string {
  if (!player) return `<span class="pname"><span class="pname__last">${esc(fallback)}</span></span>`;
  const full = tDynamic(player.name).trim();
  const [first, ...rest] = full.split(/\s+/);
  return `<span class="pname" dir="auto">${
    rest.length
      ? `<span class="pname__first">${esc(first)}</span> <span class="pname__last">${esc(rest.join(" "))}</span>`
      : `<span class="pname__last">${esc(first)}</span>`
  }</span>`;
}

function teamBlock(team: Team | undefined): string {
  return team
    ? `<div class="slip__team"><span class="logo-disc logo-disc--md"><img src="${team.logo}" alt="" /></span><span dir="auto">${esc(teamName(team))}</span></div>`
    : `<div class="slip__team"></div>`;
}

function scoreDigits(home: number | null, away: number | null): string {
  return `<span class="score-digits num--display"><span>${home ?? "–"}</span><span class="score-digits__dash">-</span><span>${away ?? "–"}</span></span>`;
}

/** Home score beside the home logo, away beside the away logo - no guessing which is which. */
function scorePair(home: string, away: string, homeTeam?: Team, awayTeam?: Team): string {
  const logo = (tm?: Team) =>
    tm ? `<span class="logo-disc logo-disc--sm"><img src="${tm.logo}" alt="${esc(teamName(tm))}" /></span>` : "";
  return `<span class="score-pair">${logo(homeTeam)}<span class="score-pair__n">${home}</span><span class="score-pair__dash">-</span><span class="score-pair__n">${away}</span>${logo(awayTeam)}</span>`;
}

// --------------------------------------------------------------------- slip

export function predictionSlip(
  prediction: GamePrediction,
  game: ScheduleGame | null,
  playerById: (id: string) => Player | undefined,
): HTMLElement {
  const slip = el("section", "slip card");
  const home = game ? TEAMS[game.homeTeamId] : undefined;
  const away = game ? TEAMS[game.awayTeamId] : undefined;

  slip.innerHTML = `
    <header class="slip__head">
      ${teamBlock(home)}
      <div class="slip__score">
        <span class="slip__label">${t("prediction.step.score")}</span>
        ${scoreDigits(prediction.predictedHomeScore, prediction.predictedAwayScore)}
      </div>
      ${teamBlock(away)}
    </header>`;

  const list = el("div", "leaders");
  CATEGORY_ORDER.forEach((category) => {
    const config = CATEGORY_CONFIG[category];
    const id = prediction[config.playerKey];
    const player = id ? playerById(id) : undefined;
    const amount = prediction[config.amountKey];
    list.appendChild(
      el(
        "div",
        "leader-row",
        `<span class="leader-row__stat">${icon(CATEGORY_ICON[category])}<span>${t(config.labelKey)}</span></span>
         <span class="leader-row__player">
           ${playerMedia(player, "sm")}
           ${player ? playerNameHTML(player) : `<span class="pname c-3">${t("prediction.summary.notSelected")}</span>`}
         </span>
         <span class="leader-row__value">
           <span class="num">${amount ?? "–"}</span>
           <span class="leader-row__unit">${t(config.amountLabelKey)}</span>
         </span>`,
      ),
    );
  });
  slip.appendChild(list);

  const team = el("div", "slip__team-stats");
  (Object.keys(TEAM_STAT_ICON) as (keyof typeof TEAM_STAT_ICON)[]).forEach((key) => {
    const labelKey = {
      predictedTeamThrees: "prediction.teamStep.threes",
      predictedTeamRebounds: "prediction.teamStep.rebounds",
      predictedTeamAssists: "prediction.teamStep.assists",
    }[key];
    team.appendChild(
      el(
        "div",
        "team-stat",
        `${icon(TEAM_STAT_ICON[key])}<span class="num team-stat__value">${prediction[key] ?? "–"}</span><span class="team-stat__label">${t(labelKey)}</span>`,
      ),
    );
  });
  slip.appendChild(team);

  const bonus = game ? BONUS_QUESTIONS.get(game.id) : undefined;
  if (bonus && prediction.predictedBonusAnswer !== null) {
    const b = el(
      "div",
      "slip__bonus",
      `${icon("statBonus")}<span class="slip__bonus-q" dir="auto"></span><strong>${prediction.predictedBonusAnswer ? t("common.yes") : t("common.no")}</strong>`,
    );
    b.querySelector(".slip__bonus-q")!.textContent = tDynamic(bonus.question);
    slip.appendChild(b);
  }
  return slip;
}

// ------------------------------------------------------------------ compare

/**
 * Predicted vs. actual as an aligned table - one row per question:
 *   stat | predicted (photo, name, value) | actual (photo, name, value) | points
 * Phones fold the stat and points onto a line above the two values.
 */
type Cell = { player?: Player | null; value: string; picked?: boolean };

function cellHTML(c: Cell, withPlayer: boolean): string {
  const who = withPlayer
    ? `${playerMedia(c.player, "sm")}<span class="ctable__who">${
        c.player ? playerNameHTML(c.player) : `<span class="pname c-3">${c.picked === false ? t("prediction.summary.notSelected") : "–"}</span>`
      }</span>`
    : "";
  return `<div class="ctable__cell${withPlayer ? " has-player" : ""}">${who}<span class="ctable__val">${c.value}</span></div>`;
}

function ctableRow(opts: {
  iconName: IconName;
  label: string;
  pred: Cell;
  actual: Cell;
  withPlayer?: boolean;
  points?: number | null;
  match?: boolean;
  labelIsText?: boolean;
}): HTMLElement {
  const row = el(
    "div",
    `ctable__row${opts.match ? " is-match" : ""}`,
    `<div class="ctable__stat">${icon(opts.iconName)}<span class="ctable__label" dir="auto"></span></div>
     ${cellHTML(opts.pred, !!opts.withPlayer).replace('class="ctable__cell', 'class="ctable__cell ctable__cell--pred')}
     ${cellHTML(opts.actual, !!opts.withPlayer).replace('class="ctable__cell', 'class="ctable__cell ctable__cell--actual')}
     ${opts.points === undefined ? "" : `<div class="ctable__pts">${opts.points === null ? "" : pointsChip(opts.points)}</div>`}`,
  );
  row.querySelector(".ctable__label")!.textContent = opts.label;
  return row;
}

function ctableHead(predLabel: string, withPoints: boolean): string {
  return `<div class="ctable__head">
      <span class="ctable__h-stat"></span>
      <span class="ctable__h ctable__h--pred">${esc(predLabel)}</span>
      <span class="ctable__h ctable__h--actual">${t("prediction.breakdown.header.actual")}</span>
      ${withPoints ? `<span class="ctable__h ctable__h--pts">${t("prediction.breakdown.header.points")}</span>` : ""}
    </div>`;
}

/** Predicted vs. actual, with the points each line earned. */
export function predictionCompare(opts: {
  prediction: GamePrediction;
  result: GameResultData | null;
  rules: ScoringRules;
  gameId: string;
  game?: ScheduleGame | null;
  playerById: (id: string) => Player | undefined;
  total: number | null;
  /** Column title for the predicted side ("You predicted" / "Their prediction"). */
  predictedLabel?: string;
}): HTMLElement {
  const { prediction: p, result: r, rules, playerById } = opts;
  const wrap = el("section", "ctable card");
  const home = opts.game ? TEAMS[opts.game.homeTeamId] : undefined;
  const away = opts.game ? TEAMS[opts.game.awayTeamId] : undefined;
  wrap.innerHTML = ctableHead(opts.predictedLabel ?? t("prediction.breakdown.header.predicted"), true);
  const body = el("div", "ctable__body");

  const pHome = p.predictedHomeScore;
  const pAway = p.predictedAwayScore;
  const aHome = r?.actualHomeScore ?? null;
  const aAway = r?.actualAwayScore ?? null;
  body.appendChild(
    ctableRow({
      iconName: "statScore",
      label: t("prediction.step.score"),
      pred: { value: scorePair(String(pHome ?? "–"), String(pAway ?? "–"), home, away) },
      actual: { value: scorePair(String(aHome ?? "–"), String(aAway ?? "–"), home, away) },
      points:
        pHome !== null && pAway !== null && aHome !== null && aAway !== null
          ? finalScorePoints(pHome, pAway, aHome, aAway, rules)
          : 0,
    }),
  );

  CATEGORY_ORDER.forEach((category) => {
    const config = CATEGORY_CONFIG[category];
    const pid = p[config.playerKey];
    const pAmount = p[config.amountKey];
    const aid = r ? r[config.actualPlayerKey] : null;
    const aAmount = r ? r[config.actualAmountKey] : null;
    body.appendChild(
      ctableRow({
        iconName: CATEGORY_ICON[category],
        label: t(config.labelKey),
        withPlayer: true,
        pred: { player: pid ? playerById(pid) : null, value: String(pAmount ?? "–"), picked: !!pid },
        actual: { player: aid ? playerById(aid) : null, value: String(aAmount ?? "–") },
        points: topStatPoints(pid, pAmount, aid, aAmount, rules),
        match: !!pid && pid === aid,
      }),
    );
  });

  const teamLines: { key: keyof typeof TEAM_STAT_ICON; labelKey: string; actual: number | null }[] = [
    { key: "predictedTeamThrees", labelKey: "prediction.breakdown.teamThrees", actual: r?.actualTeamThrees ?? null },
    { key: "predictedTeamRebounds", labelKey: "prediction.breakdown.teamRebounds", actual: r?.actualTeamRebounds ?? null },
    { key: "predictedTeamAssists", labelKey: "prediction.breakdown.teamAssists", actual: r?.actualTeamAssists ?? null },
  ];
  teamLines.forEach(({ key, labelKey, actual }) => {
    const predicted = p[key];
    body.appendChild(
      ctableRow({
        iconName: TEAM_STAT_ICON[key],
        label: t(labelKey),
        pred: { value: String(predicted ?? "–") },
        actual: { value: String(actual ?? "–") },
        points: predicted !== null && actual !== null ? teamStatPoints(predicted, actual, rules) : 0,
      }),
    );
  });

  const bonus = BONUS_QUESTIONS.get(opts.gameId);
  if (bonus && r?.actualBonusAnswer != null) {
    const predicted = p.predictedBonusAnswer;
    const actual = r.actualBonusAnswer;
    const yn = (v: boolean | null) => (v === null ? "–" : v ? t("common.yes") : t("common.no"));
    body.appendChild(
      ctableRow({
        iconName: "statBonus",
        label: tDynamic(bonus.question),
        pred: { value: yn(predicted) },
        actual: { value: yn(actual) },
        points: predicted !== null && predicted === actual ? bonus.points : 0,
      }),
    );
  }
  wrap.appendChild(body);

  if (opts.total !== null) {
    wrap.appendChild(
      el(
        "footer",
        "ctable__total",
        `<span>${t("prediction.breakdown.totalLabel")}</span><span class="ctable__total-n">${opts.total}</span>`,
      ),
    );
  }
  return wrap;
}

function pointsChip(points: number): string {
  return `<span class="pts-chip${points > 0 ? " is-earned" : ""}"><span class="num">${points > 0 ? `+${points}` : "0"}</span></span>`;
}

// ---------------------------------------------------------------- aggregate

export function aggregateCard(
  agg: PredictionsAggregate,
  game: ScheduleGame | null,
  playerById: (id: string) => Player | undefined,
): HTMLElement {
  const card = el("section", "aggregate card");
  const home = game ? TEAMS[game.homeTeamId] : undefined;
  const away = game ? TEAMS[game.awayTeamId] : undefined;
  card.innerHTML = `
    <header class="card__head">
      <h2>${t("prediction.aggregate.title")}</h2>
      <span class="tag">${icon("users")}${esc(t("prediction.aggregate.count", { n: agg.totalPredictions }))}</span>
    </header>`;

  if (agg.avgHomeScore !== null && agg.avgAwayScore !== null) {
    card.appendChild(
      el(
        "div",
        "aggregate__score",
        `${home ? `<span class="logo-disc logo-disc--sm"><img src="${home.logo}" alt="${esc(teamName(home))}" /></span>` : ""}
         <div class="aggregate__score-mid">
           <span class="aggregate__label">${t("prediction.aggregate.avgScoreLabel")}</span>
           ${scoreDigits(Math.round(agg.avgHomeScore), Math.round(agg.avgAwayScore))}
         </div>
         ${away ? `<span class="logo-disc logo-disc--sm"><img src="${away.logo}" alt="${esc(teamName(away))}" /></span>` : ""}`,
      ),
    );
  }

  const leaders = el("div", "leaders");
  const lines: { cat: StatCategory; id: string | null; avg: number | null }[] = [
    { cat: "scorer", id: agg.topScorerPlayerId, avg: agg.avgTopScorerPoints },
    { cat: "rebounder", id: agg.topRebounderPlayerId, avg: agg.avgTopRebounds },
    { cat: "assist", id: agg.topAssistPlayerId, avg: agg.avgTopAssists },
  ];
  lines.forEach(({ cat, id, avg }) => {
    if (!id) return;
    const player = playerById(id);
    const config = CATEGORY_CONFIG[cat];
    leaders.appendChild(
      el(
        "div",
        "leader-row",
        `<span class="leader-row__stat">${icon(CATEGORY_ICON[cat])}<span>${t(config.labelKey)}</span></span>
         <span class="leader-row__player">${playerMedia(player, "sm")}${player ? playerNameHTML(player) : `<span class="pname">${t("prediction.aggregate.unknownPlayer")}</span>`}</span>
         <span class="leader-row__value">${avg !== null ? `<span class="num">${Math.round(avg)}</span><span class="leader-row__unit">${t("prediction.aggregate.avgShort")}</span>` : ""}</span>`,
      ),
    );
  });
  if (leaders.childElementCount) {
    card.appendChild(el("p", "aggregate__sub overline", t("prediction.aggregate.popularTitle")));
    card.appendChild(leaders);
  }

  const team = el("div", "slip__team-stats");
  const teamAvgs: [IconName, string, number | null][] = [
    ["statThrees", "prediction.teamStep.threes", agg.avgTeamThrees],
    ["statTeamRebounds", "prediction.teamStep.rebounds", agg.avgTeamRebounds],
    ["statTeamAssists", "prediction.teamStep.assists", agg.avgTeamAssists],
  ];
  teamAvgs.forEach(([ic, key, v]) => {
    if (v === null) return;
    team.appendChild(
      el("div", "team-stat", `${icon(ic)}<span class="num team-stat__value">${Math.round(v)}</span><span class="team-stat__label">${t(key)}</span>`),
    );
  });
  if (team.childElementCount) card.appendChild(team);
  return card;
}

// ------------------------------------------------------------ final result

/** The final score as a photo masthead - top of every finished game. */
export function resultHeader(game: ScheduleGame, result: GameResultData | null): HTMLElement {
  const home = TEAMS[game.homeTeamId];
  const away = TEAMS[game.awayTeamId];
  const h = result?.actualHomeScore ?? game.result?.home ?? null;
  const a = result?.actualAwayScore ?? game.result?.away ?? null;
  const side = (tm: Team | undefined, score: number | null, won: boolean) => `
    <div class="final__team${won ? " is-winner" : ""}">
      ${tm ? `<span class="logo-disc logo-disc--lg"><img src="${tm.logo}" alt="" /></span>` : ""}
      <span class="final__name" dir="auto">${esc(tm ? teamName(tm) : "")}</span>
      <span class="final__score num--display">${score ?? "–"}</span>
    </div>`;
  return el(
    "section",
    "final",
    `<div class="final__inner">
       <p class="final__label">${t("prediction.result.final")}</p>
       <div class="final__teams">
         ${side(home, h, h !== null && a !== null && h > a)}
         ${side(away, a, h !== null && a !== null && a > h)}
       </div>
     </div>`,
  );
}

// ------------------------------------------------------ crowd vs. actual

/** What everyone predicted (averages, most-picked players) next to what happened. */
export function crowdCompare(
  agg: PredictionsAggregate,
  r: GameResultData,
  game: ScheduleGame | null,
  playerById: (id: string) => Player | undefined,
): HTMLElement {
  const wrap = el("section", "ctable ctable--crowd card");
  const fmt = (v: number | null) => (v === null ? "–" : String(Math.round(v)));
  const home = game ? TEAMS[game.homeTeamId] : undefined;
  const away = game ? TEAMS[game.awayTeamId] : undefined;

  wrap.innerHTML = `
    <header class="ctable__title">
      <h2>${t("prediction.crowd.title")}</h2>
      <span class="tag">${icon("users")}${esc(t("prediction.aggregate.count", { n: agg.totalPredictions }))}</span>
    </header>
    ${ctableHead(t("prediction.crowd.side"), false)}`;
  const body = el("div", "ctable__body");

  body.appendChild(
    ctableRow({
      iconName: "statScore",
      label: t("prediction.step.score"),
      pred: { value: scorePair(fmt(agg.avgHomeScore), fmt(agg.avgAwayScore), home, away) },
      actual: { value: scorePair(fmt(r.actualHomeScore), fmt(r.actualAwayScore), home, away) },
    }),
  );

  const lines: { cat: StatCategory; id: string | null; avg: number | null }[] = [
    { cat: "scorer", id: agg.topScorerPlayerId, avg: agg.avgTopScorerPoints },
    { cat: "rebounder", id: agg.topRebounderPlayerId, avg: agg.avgTopRebounds },
    { cat: "assist", id: agg.topAssistPlayerId, avg: agg.avgTopAssists },
  ];
  lines.forEach(({ cat, id, avg }) => {
    const config = CATEGORY_CONFIG[cat];
    const aid = r[config.actualPlayerKey];
    body.appendChild(
      ctableRow({
        iconName: CATEGORY_ICON[cat],
        label: t(config.labelKey),
        withPlayer: true,
        pred: { player: id ? playerById(id) : null, value: fmt(avg) },
        actual: { player: aid ? playerById(aid) : null, value: String(r[config.actualAmountKey] ?? "–") },
        match: !!id && id === aid,
      }),
    );
  });

  const teamLines: [IconName, string, number | null, number | null][] = [
    ["statThrees", "prediction.breakdown.teamThrees", agg.avgTeamThrees, r.actualTeamThrees],
    ["statTeamRebounds", "prediction.breakdown.teamRebounds", agg.avgTeamRebounds, r.actualTeamRebounds],
    ["statTeamAssists", "prediction.breakdown.teamAssists", agg.avgTeamAssists, r.actualTeamAssists],
  ];
  teamLines.forEach(([ic, key, avg, actual]) => {
    body.appendChild(
      ctableRow({ iconName: ic, label: t(key), pred: { value: fmt(avg) }, actual: { value: String(actual ?? "–") } }),
    );
  });
  wrap.appendChild(body);
  return wrap;
}
