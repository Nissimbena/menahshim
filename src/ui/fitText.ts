/**
 * Scales big display headlines (the "מנאחסים" wordmark, 'לו"ז העונה', page
 * titles) so the text spans the full width of its container, the way the
 * design lays them out edge to edge. Each target is an element with the
 * `fit-text` class whose only child is a `<span>` holding the text.
 *
 * Re-runs automatically on resize and once web fonts finish loading, since
 * the measured width depends on which font actually rendered.
 */
const BASE_SIZE = 100;

export function fitText(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".fit-text").forEach((el) => {
    const span = el.firstElementChild as HTMLElement | null;
    if (!span || el.clientWidth === 0) return;
    span.style.fontSize = `${BASE_SIZE}px`;
    const textWidth = span.getBoundingClientRect().width;
    if (textWidth === 0) return;
    const style = getComputedStyle(el);
    const available =
      el.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    const max = parseFloat(el.dataset.fitMax ?? "") || Infinity;
    const size = Math.min(max, (BASE_SIZE * available) / textWidth);
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
