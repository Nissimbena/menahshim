/**
 * Pointer-aware hover for the glass surfaces. One delegated listener: the
 * pane under the cursor gets --mx / --my (where the light hits it) and the
 * player cards also get a small 3D tilt (--rx / --ry). The CSS turns those
 * into a soft spotlight that follows the mouse - the panes feel touched,
 * not static. Mouse/trackpad only, and off under reduced motion.
 */
const SURFACES = [
  ".card",
  ".hero",
  ".pcard",
  ".ticker__game",
  ".podium__card",
  ".calendar__day.has-game",
  ".standings",
  ".ctable",
  ".ticket",
  ".sport-card",
  ".media-card",
  ".stepper-presets__chip",
  ".btn",
].join(",");

const TILT_MAX = 7; // degrees

export function initHoverEffects() {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!fine.matches) return;

  let current: HTMLElement | null = null;
  let frame = 0;
  let lastEvent: PointerEvent | null = null;

  const reset = (el: HTMLElement) => {
    el.style.removeProperty("--rx");
    el.style.removeProperty("--ry");
    el.classList.remove("is-lit");
  };

  const apply = () => {
    frame = 0;
    const e = lastEvent;
    if (!e) return;
    const target = (e.target as Element | null)?.closest<HTMLElement>(SURFACES) ?? null;
    if (target !== current) {
      if (current) reset(current);
      current = target;
    }
    if (!target) return;
    const r = target.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    target.style.setProperty("--mx", `${x}px`);
    target.style.setProperty("--my", `${y}px`);
    target.classList.add("is-lit");
    if (!reduce.matches && target.classList.contains("pcard")) {
      const px = x / r.width - 0.5;
      const py = y / r.height - 0.5;
      target.style.setProperty("--ry", `${(px * TILT_MAX).toFixed(2)}deg`);
      target.style.setProperty("--rx", `${(-py * TILT_MAX).toFixed(2)}deg`);
    }
  };

  document.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      lastEvent = e;
      if (!frame) frame = requestAnimationFrame(apply);
    },
    { passive: true },
  );
  document.addEventListener("pointerleave", () => {
    if (current) reset(current);
    current = null;
  });
}
