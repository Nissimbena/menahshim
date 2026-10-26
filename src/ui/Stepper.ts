import { t } from "../i18n/i18n";
import { icon } from "./icons";
import { el } from "./dom";

/**
 * Big "− value +" number input. Typing still works (the value is a real
 * <input type="number">); the buttons just edit it and fire the same input
 * event, so validation is identical either way:
 *   empty      -> null, valid
 *   0..max     -> number, valid
 *   otherwise  -> null, invalid (error shown, caller disables "next")
 */
export function numberStepper(opts: {
  value: number | null;
  max: number;
  /** What the first tap on +/− jumps to when the field is still empty. */
  emptyStart: number;
  label: string;
  size?: "lg" | "md";
  /** Typical values offered as one-tap chips under the stepper. */
  presets?: number[];
  onValue: (value: number | null, valid: boolean) => void;
}): { root: HTMLElement; error: HTMLElement; presets: HTMLElement | null } {
  const root = el("div", `stepper${opts.size === "md" ? " stepper--md" : ""}`);
  const minus = el("button", "stepper__btn", icon("minus"));
  const plus = el("button", "stepper__btn", icon("plus"));
  minus.type = "button";
  plus.type = "button";
  minus.setAttribute("aria-label", t("common.decrease"));
  plus.setAttribute("aria-label", t("common.increase"));

  const input = el("input", "stepper__input");
  input.type = "number";
  input.inputMode = "numeric";
  input.min = "0";
  input.max = String(opts.max);
  input.placeholder = "?";
  input.value = opts.value === null ? "" : String(opts.value);
  input.setAttribute("aria-label", opts.label);

  const error = el("div", "field-error-msg");
  error.setAttribute("aria-live", "polite");

  let presetRow: HTMLElement | null = null;
  const syncPresets = () => {
    presetRow?.querySelectorAll<HTMLButtonElement>(".stepper-presets__chip").forEach((chip) => {
      chip.setAttribute("aria-pressed", String(chip.dataset.value === input.value));
    });
  };

  input.addEventListener("input", () => {
    syncPresets();
    if (input.value === "") {
      input.classList.remove("field-invalid");
      input.removeAttribute("aria-invalid");
      error.textContent = "";
      opts.onValue(null, true);
      return;
    }
    const parsed = Number(input.value);
    const valid = Number.isFinite(parsed) && parsed >= 0 && parsed <= opts.max;
    input.classList.toggle("field-invalid", !valid);
    if (valid) input.removeAttribute("aria-invalid");
    else input.setAttribute("aria-invalid", "true");
    error.textContent = valid ? "" : t("prediction.error.range", { min: 0, max: opts.max });
    opts.onValue(valid ? parsed : null, valid);
  });

  // Empty field: either button lands on a realistic starting value, so
  // nobody has to tap "+" twenty times to reach a scorer's points.
  const step = (delta: number) => {
    const current = Number(input.value);
    let next: number;
    if (input.value === "" || !Number.isFinite(current)) next = opts.emptyStart;
    else next = Math.min(opts.max, Math.max(0, Math.round(current) + delta));
    input.value = String(next);
    input.dispatchEvent(new Event("input"));
  };
  minus.addEventListener("click", () => step(-1));
  plus.addEventListener("click", () => step(1));

  // Inline order: − value + (mirrors naturally in RTL to + value −, which is
  // what Hebrew sports apps do; the icons themselves are direction-neutral).
  root.append(minus, input, plus);

  if (opts.presets?.length) {
    presetRow = el("div", "stepper-presets");
    presetRow.setAttribute("role", "group");
    presetRow.setAttribute("aria-label", t("prediction.quickPick"));
    opts.presets.forEach((v) => {
      const chip = el("button", "stepper-presets__chip", String(v));
      chip.type = "button";
      chip.dataset.value = String(v);
      chip.addEventListener("click", () => {
        input.value = String(v);
        input.dispatchEvent(new Event("input"));
      });
      presetRow!.appendChild(chip);
    });
    syncPresets();
  }
  return { root, error, presets: presetRow };
}
