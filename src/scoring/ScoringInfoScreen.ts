import { getScoringRules, type ScoringRules } from "../api/backend";
import { t } from "../i18n/i18n";
import { finalScorePoints } from "../prediction/PredictionScreen";
import { screenHeader, skeleton, emptyState } from "../ui/ScreenHeader";
import { icon } from "../ui/icons";
import { el, ltr } from "../ui/dom";

/**
 * Explanation screen for how points are calculated ("איך עובד הניקוד"),
 * fetched from the backend's /scoring-rules so it never drifts out of sync
 * with the real scoring logic in scoring.py.
 */
export class ScoringInfoScreen {
  private container: HTMLElement;
  private onBack: () => void;

  constructor(container: HTMLElement, onBack: () => void) {
    this.container = container;
    this.onBack = onBack;
  }

  async show() {
    this.container.classList.remove("hidden");
    this.renderLoading();
    try {
      const rules = await getScoringRules();
      this.render(rules);
    } catch (err) {
      console.error("Failed to load scoring rules:", err);
      this.renderError();
    }
  }

  hide() {
    this.container.classList.add("hidden");
  }

  private page(): HTMLElement {
    this.container.innerHTML = "";
    const page = el("div", "screen scoring");
    page.appendChild(screenHeader({ title: t("home.menu.scoringInfo"), onBack: () => this.onBack() }));
    this.container.appendChild(page);
    return page;
  }

  private renderLoading() {
    this.page().appendChild(skeleton("cards", 3));
  }

  private renderError() {
    this.page().appendChild(emptyState(t("scoring.error"), "error"));
  }

  /** A "what you did -> points" table. */
  private pointsTable(title: string, rows: [string, number][]): HTMLElement {
    const section = el("section", "scoring__section");
    const h = el("h2", "t-h2");
    h.textContent = title;
    section.appendChild(h);
    const list = el("dl", "list points-table");
    rows.forEach(([label, points]) => {
      const row = el("div", "list-row points-table__row");
      row.innerHTML = `<dt class="list-row__main" dir="auto"></dt><dd class="points-table__pts"><span class="num">${points}</span> <span class="c-3">${t("scoring.pointsUnit")}</span></dd>`;
      row.querySelector("dt")!.textContent = label;
      list.appendChild(row);
    });
    section.appendChild(list);
    return section;
  }

  /** Plain explanatory section: H2 + paragraphs in a reading column. */
  private textSection(title: string, paragraphs: string[]): HTMLElement {
    const section = el("section", "scoring__section prose");
    const h = el("h2", "t-h2");
    h.textContent = title;
    section.appendChild(h);
    paragraphs.forEach((text) => {
      const p = el("p");
      p.dir = "auto";
      p.textContent = text;
      section.appendChild(p);
    });
    return section;
  }

  /** One worked example of the final-score rule, computed with the real scoring helper. */
  private example(rules: ScoringRules): HTMLElement {
    const predicted: [number, number] = [85, 78];
    const actual: [number, number] =
      rules.finalScoreCloseMarginRange >= 1 ? [88, 80] : [92, 80];
    const points = finalScorePoints(predicted[0], predicted[1], actual[0], actual[1], rules);
    const card = el("section", "card card--lg scoring-example");
    const score = (label: string, [h, a]: [number, number]) =>
      `<div class="scoring-example__score"><span class="overline">${label}</span><span class="t-h2 num">${ltr(`${h}–${a}`)}</span></div>`;
    card.innerHTML = `
      <span class="tag">${t("scoring.example.title")}</span>
      <div class="scoring-example__row">
        ${score(t("scoring.example.predicted"), predicted)}
        ${icon("arrowForward", { className: "c-3" })}
        ${score(t("scoring.example.actual"), actual)}
        <span class="scoring-example__pts num">+${points}</span>
      </div>
      <p class="c-2 t-small" dir="auto"></p>`;
    card.querySelector("p")!.textContent = t("scoring.example.text", {
      diff: Math.abs((predicted[0] - predicted[1]) - (actual[0] - actual[1])),
      points,
    });
    return card;
  }

  private render(rules: ScoringRules) {
    const page = this.page();

    page.appendChild(
      this.pointsTable(t("prediction.step.score"), [
        [t("scoring.s1.r1.label"), rules.finalScoreExactPoints],
        [t("scoring.s1.r2.label"), rules.finalScoreMarginPoints],
        [t("scoring.s1.r2b.label", { range: rules.finalScoreCloseMarginRange }), rules.finalScoreCloseMarginPoints],
        [t("scoring.s1.r3.label"), rules.finalScoreDirectionPoints],
      ]),
    );
    page.appendChild(this.example(rules));
    page.appendChild(
      this.pointsTable(t("scoring.s2.title"), [
        [t("scoring.s2.r1.label"), rules.topStatPlayerPoints],
        [t("scoring.s2.r2.label"), rules.topStatExactPoints],
        [t("scoring.s2.r3.label", { range: rules.topStatCloseRange }), rules.topStatClosePoints],
      ]),
    );
    page.appendChild(
      this.pointsTable(t("scoring.s4.title"), [
        [t("scoring.s4.r1.label"), rules.teamStatExactPoints],
        [t("scoring.s4.r2.label", { range: rules.teamStatCloseRange }), rules.teamStatClosePoints],
      ]),
    );
    page.appendChild(
      this.textSection(t("scoring.s3.title"), [t("scoring.s3.r1"), t("scoring.s3.r2"), t("scoring.s3.r3")]),
    );
    page.appendChild(this.textSection(t("scoring.s5.title"), [t("scoring.s5.r1")]));
    page.appendChild(
      this.textSection(t("challenge.rules.title"), [
        t("challenge.rules.r1"),
        t("challenge.rules.r2"),
        t("challenge.rules.r3"),
        t("challenge.rules.r4"),
        t("challenge.rules.r5"),
        t("challenge.rules.r6"),
        t("challenge.rules.r7"),
      ]),
    );
    page.appendChild(
      this.textSection(t("scoring.prize.title"), [t("scoring.prize.r1"), t("scoring.prize.r2"), t("scoring.prize.r3")]),
    );
    page.appendChild(this.textSection(t("scoring.sponsor.title"), [t("scoring.sponsor.text")]));
  }
}
