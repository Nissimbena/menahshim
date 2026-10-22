import "./sportsHub.css";
import { SPORTS } from "./sportsData";
import { t, getLang } from "../i18n/i18n";

const RADIUS = 160;

/** Step 1 of the drill-down: pick a sport via a 3D draggable orbital carousel. */
export class SportsHomeScreen {
  private container: HTMLElement;
  private onBack: () => void;
  private onSelectSport: (sportId: string) => void;

  private currentAngle = 0;
  private activeIndex = 0;
  private dragging = false;
  private dragStartX = 0;
  private dragStartAngle = 0;

  constructor(
    container: HTMLElement,
    onBack: () => void,
    onSelectSport: (sportId: string) => void,
  ) {
    this.container = container;
    this.onBack = onBack;
    this.onSelectSport = onSelectSport;

    window.addEventListener("langchange", () => {
      if (!this.container.classList.contains("hidden")) this.render();
    });
  }

  show() {
    this.currentAngle = 0;
    this.activeIndex = 0;
    this.container.classList.remove("hidden");
    this.render();
  }

  hide() {
    this.container.classList.add("hidden");
  }

  private sportLabel(sport: (typeof SPORTS)[number]): string {
    return getLang() === "en" ? sport.nameEn : sport.nameHe;
  }

  private render() {
    this.container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "sports-hub-screen";

    const grid = document.createElement("div");
    grid.className = "sh-cyber-grid";
    wrapper.appendChild(grid);

    const header = document.createElement("div");
    header.className = "sh-header";
    header.innerHTML = `
      <button type="button" class="sh-back-btn">&rarr; ${t("common.back")}</button>
      <div class="sh-header-title sh-display">${t("sportsHub.home.title")}</div>
      <div style="width:70px;"></div>
    `;
    header
      .querySelector(".sh-back-btn")
      ?.addEventListener("click", () => this.onBack());
    wrapper.appendChild(header);

    const content = document.createElement("div");
    content.className = "sh-content";

    const subtitle = document.createElement("p");
    subtitle.className = "sh-subtitle";
    subtitle.textContent = t("sportsHub.home.subtitle");
    content.appendChild(subtitle);

    const angleStep = 360 / SPORTS.length;

    const scene = document.createElement("div");
    scene.className = "sh-scene";
    const carousel = document.createElement("div");
    carousel.className = "sh-carousel";

    const itemEls: HTMLElement[] = [];
    SPORTS.forEach((sport, index) => {
      const item = document.createElement("div");
      item.className = "sh-carousel-item" + (index === 0 ? " active" : "");
      item.style.transform = `rotateY(${angleStep * index}deg) translateZ(${RADIUS}px)`;
      item.innerHTML = `
        <span class="sh-sport-icon">${sport.icon}</span>
        <span class="sh-sport-name">${this.sportLabel(sport)}</span>
      `;
      carousel.appendChild(item);
      itemEls.push(item);
    });
    scene.appendChild(carousel);
    content.appendChild(scene);

    const activeWrap = document.createElement("div");
    activeWrap.className = "sh-active-sport-wrap";
    activeWrap.innerHTML = `
      <div class="sh-active-sport-name">${this.sportLabel(SPORTS[0])}</div>
      <div class="sh-active-sport-hint">${t("sportsHub.home.dragHint")}</div>
    `;
    content.appendChild(activeWrap);
    const activeNameEl = activeWrap.querySelector(
      ".sh-active-sport-name",
    ) as HTMLElement;

    const enterBtn = document.createElement("button");
    enterBtn.type = "button";
    enterBtn.className = "sh-enter-btn";
    enterBtn.textContent = t("sportsHub.home.enterBtn");
    enterBtn.addEventListener("click", () =>
      this.onSelectSport(SPORTS[this.activeIndex].id),
    );
    content.appendChild(enterBtn);

    wrapper.appendChild(content);
    this.container.appendChild(wrapper);

    const updateCarousel = (instant: boolean) => {
      carousel.style.transition = instant
        ? "none"
        : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)";
      carousel.style.transform = `rotateY(${this.currentAngle}deg)`;

      let normalized = this.currentAngle % 360;
      if (normalized > 0) normalized -= 360;
      const activeIndex =
        Math.round(Math.abs(normalized) / angleStep) % SPORTS.length;
      this.activeIndex = activeIndex;

      itemEls.forEach((el, idx) => el.classList.toggle("active", idx === activeIndex));
      activeNameEl.textContent = this.sportLabel(SPORTS[activeIndex]);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.dragging) return;
      const deltaX = e.clientX - this.dragStartX;
      this.currentAngle = this.dragStartAngle + deltaX * 0.5;
      updateCarousel(true);
    };
    const onPointerUp = () => {
      if (!this.dragging) return;
      this.dragging = false;
      carousel.classList.remove("dragging");
      this.currentAngle = Math.round(this.currentAngle / angleStep) * angleStep;
      updateCarousel(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    carousel.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      carousel.classList.add("dragging");
      this.dragStartX = e.clientX;
      this.dragStartAngle = this.currentAngle;
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    });
  }
}

