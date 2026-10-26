import { t } from "../i18n/i18n";

/**
 * Google explicitly disallows OAuth sign-in inside certain in-app WebView
 * browsers (WhatsApp, Google app/GSA, Instagram, Facebook, Line, generic
 * Android WebView) - and even when it's not outright blocked, these
 * environments often can't persist sessionStorage across the navigate-away-
 * and-back that signInWithRedirect needs, causing cryptic Firebase errors
 * ("missing initial state"). Detect them up front and tell the user to
 * switch to a real browser before they even try to sign in.
 */
const IN_APP_BROWSER_PATTERN =
  /FBAN|FBAV|Instagram|Line\/|WhatsApp|GSA\/|; wv\)|MicroMessenger/i;

export function isInAppBrowser(): boolean {
  return IN_APP_BROWSER_PATTERN.test(navigator.userAgent);
}

export function showInAppBrowserWarning() {
  const banner = document.createElement("div");
  banner.className = "in-app-browser-banner";
  banner.setAttribute("role", "alert");
  banner.dir = "auto";
  banner.textContent = t("inAppBrowser.warning");
  document.body.prepend(banner);
}
