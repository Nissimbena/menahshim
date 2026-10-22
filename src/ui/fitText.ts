/**
 * Scales big display headlines so they span the full width of their
 * container, edge to edge. A target is an element with the `fit-text` class
 * that either wraps its text in a single `<span>`, or holds several
 * `.fit-line` rows that share one font size (sized by the widest row).
 *
 * Re-runs automatically on resize and once web fonts finish loading, since
 * the measured width depends on which font actually rendered.
 */
const BASE_SIZE = 100;

export function fitText(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".fit-text").forEach((el) => {
    if (el.clientWidth === 0) return;
    const lines = Array.from(
      el.querySelectorAll<HTMLElement>(":scope > .fit-line"),
    );
    const style = getComputedStyle(el);
    const available =
      el.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    const max = parseFloat(el.dataset.fitMax ?? "") || Infinity;

    let widest = 0;
    if (lines.length) {
      el.style.fontSize = `${BASE_SIZE}px`;
      el.classList.add("fit-measuring");
      lines.forEach((line) => {
        widest = Math.max(widest, line.getBoundingClientRect().width);
      });
      el.classList.remove("fit-measuring");
      if (widest === 0) return;
      const size = Math.min(max, (BASE_SIZE * available) / widest);
      el.style.fontSize = `${Math.floor(size * 100) / 100}px`;
      return;
    }

    const span = el.firstElementChild as HTMLElement | null;
    if (!span) return;
    span.style.fontSize = `${BASE_SIZE}px`;
    widest = span.getBoundingClientRect().width;
    if (widest === 0) return;
    const size = Math.min(max, (BASE_SIZE * available) / widest);
    // Floor to avoid a 1px overflow from sub-pixel rounding.
    span.style.fontSize = `${Math.floor(size * 100) / 100}px`;
  });
}

let scheduled = false;
function scheduleFit() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    fitText();
  });
}

window.addEventListener("resize", scheduleFit);
if (document.fonts) {
  document.fonts.ready.then(scheduleFit);
  document.fonts.addEventListener?.("loadingdone", scheduleFit);
}
