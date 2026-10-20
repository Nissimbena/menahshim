import { getScoringRules, type ScoringRules } from "../api/backend";
import { t } from "../i18n/i18n";

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

  private renderHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className = "prediction-header";
    header.innerHTML = `
      <button class="btn-back" type="button">&rarr; ${t("common.back")}</button>
      <div class="prediction-title"><h1>${t("home.menu.scoringInfo")}</h1></div>
      <div class="prediction-header-spacer"></div>
    `;
    header
      .querySelector(".btn-back")
      ?.addEventListener("click", () => this.onBack());
    return header;
  }

  private renderLoading() {
    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "leaderboard-wrapper";
    wrapper.appendChild(this.renderHeader());
    const p = document.createElement("p");
    p.className = "counter-text";
    p.textContent = t("common.loading");
    wrapper.appendChild(p);
    this.container.appendChild(wrapper);
  }

  private renderError() {
    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "leaderboard-wrapper";
    wrapper.appendChild(this.renderHeader());
    const p = document.createElement("p");
    p.className = "counter-text";
    p.textContent = t("scoring.error");
    wrapper.appendChild(p);
    this.container.appendChild(wrapper);
  }

  private render(rules: ScoringRules) {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "leaderboard-wrapper";
    wrapper.appendChild(this.renderHeader());

    const sections: { title: string; rows: string[] }[] = [
      {
        title: t("prediction.step.score"),
        rows: [
          t("scoring.s1.r1", { points: rules.finalScoreExactPoints }),
          t("scoring.s1.r2", { points: rules.finalScoreMarginPoints }),
          t("scoring.s1.r2b", {
            range: rules.finalScoreCloseMarginRange,
            points: rules.finalScoreCloseMarginPoints,
          }),
          t("scoring.s1.r3", { points: rules.finalScoreDirectionPoints }),
        ],
      },
      {
        title: t("scoring.s2.title"),
        rows: [
          t("scoring.s2.r1", { points: rules.topStatPlayerPoints }),
          t("scoring.s2.r2", { points: rules.topStatExactPoints }),
          t("scoring.s2.r3", {
            range: rules.topStatCloseRange,
            points: rules.topStatClosePoints,
          }),
        ],
      },
      {
        title: t("scoring.s3.title"),
        rows: [t("scoring.s3.r1"), t("scoring.s3.r2"), t("scoring.s3.r3")],
      },
      {
        title: t("scoring.s4.title"),
        rows: [
          t("scoring.s4.r1", { points: rules.teamStatExactPoints }),
          t("scoring.s4.r2", {
            range: rules.teamStatCloseRange,
            points: rules.teamStatClosePoints,
          }),
        ],
      },
      {
        title: t("scoring.s5.title"),
        rows: [t("scoring.s5.r1")],
      },
    ];

    sections.forEach(({ title, rows }) => {
      const card = document.createElement("div");
      card.className = "scoring-rule-card";
      card.innerHTML = `<h4>${title}</h4>`;
      rows.forEach((text) => {
        const p = document.createElement("p");
        p.dir = "auto";
        p.textContent = text;
        card.appendChild(p);
      });
      wrapper.appendChild(card);
    });

    const challengeCard = document.createElement("div");
    challengeCard.className = "scoring-rule-card";
    challengeCard.innerHTML = `<h4>${t("challenge.rules.title")}</h4>`;
    [
      t("challenge.rules.r1"),
      t("challenge.rules.r2"),
      t("challenge.rules.r3"),
      t("challenge.rules.r4"),
      t("challenge.rules.r5"),
      t("challenge.rules.r6"),
      t("challenge.rules.r7"),
    ].forEach((text) => {
      const p = document.createElement("p");
      p.dir = "auto";
      p.textContent = text;
      challengeCard.appendChild(p);
    });
    wrapper.appendChild(challengeCard);

    const prizeCard = document.createElement("div");
    prizeCard.className = "scoring-rule-card";
    prizeCard.innerHTML = `<h4>${t("scoring.prize.title")}</h4>`;
    [
      t("scoring.prize.r1"),
      t("scoring.prize.r2"),
      t("scoring.prize.r3"),
    ].forEach((text) => {
      const p = document.createElement("p");
      p.dir = "auto";
      p.textContent = text;
      prizeCard.appendChild(p);
    });
    wrapper.appendChild(prizeCard);

    const sponsorCard = document.createElement("div");
    sponsorCard.className = "scoring-rule-card";
    sponsorCard.innerHTML = `<h4>${t("scoring.sponsor.title")}</h4>`;
    const sponsorP = document.createElement("p");
    sponsorP.dir = "auto";
    sponsorP.textContent = t("scoring.sponsor.text");
    sponsorCard.appendChild(sponsorP);
    wrapper.appendChild(sponsorCard);

    this.container.appendChild(wrapper);
  }
}
