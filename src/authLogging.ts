const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://hapoel-jerusalem-api-354078768099.us-central1.run.app";

export interface ParsedUserAgent {
  deviceType: string;
  osName: string;
  osVersion: string;
  browserName: string;
  browserVersion: string;
}

/** Deliberately simple regex-based parsing - just enough to answer "what device/browser was this", no dependency needed. */
export function parseUserAgent(ua: string): ParsedUserAgent {
  const deviceType = /iPad/.test(ua)
    ? "iPad"
    : /iPhone/.test(ua)
      ? "iPhone"
      : /Android/.test(ua)
        ? /Mobile/.test(ua)
          ? "Android Phone"
          : "Android Tablet"
        : "Desktop";

  let osName = "Unknown";
  let osVersion = "";
  const iosMatch = ua.match(/(?:iPhone )?OS (\d+[_.]\d+(?:[_.]\d+)?)/);
  const androidMatch = ua.match(/Android (\d+(?:\.\d+)?)/);
  const macMatch = ua.match(/Mac OS X (\d+[_.]\d+(?:[_.]\d+)?)/);
  const winMatch = ua.match(/Windows NT (\d+\.\d+)/);
  if (/iPhone|iPad/.test(ua) && iosMatch) {
    osName = "iOS";
    osVersion = iosMatch[1].replace(/_/g, ".");
  } else if (androidMatch) {
    osName = "Android";
    osVersion = androidMatch[1];
  } else if (macMatch) {
    osName = "macOS";
    osVersion = macMatch[1].replace(/_/g, ".");
  } else if (winMatch) {
    osName = "Windows";
    osVersion = winMatch[1];
  }

  // Order matters - in-app WebViews first (they also contain "Safari"/"Chrome" in their UA string).
  let browserName = "Unknown";
  let browserVersion = "";
  const checks: [RegExp, string, RegExp][] = [
    [/WhatsApp\/([\d.]+)/, "WhatsApp", /WhatsApp\/([\d.]+)/],
    [/GSA\/([\d.]+)/, "Google App", /GSA\/([\d.]+)/],
    [/FBAN|FBAV/, "Facebook", /FBAV\/([\d.]+)/],
    [/Instagram/, "Instagram", /Instagram ([\d.]+)/],
    [/Line\//, "Line", /Line\/([\d.]+)/],
    [/; wv\)/, "Android WebView", /Version\/([\d.]+)/],
    [/Edg\/([\d.]+)/, "Edge", /Edg\/([\d.]+)/],
    [/CriOS\/([\d.]+)/, "Chrome (iOS)", /CriOS\/([\d.]+)/],
    [/Chrome\/([\d.]+)/, "Chrome", /Chrome\/([\d.]+)/],
    [/Version\/([\d.]+).*Safari/, "Safari", /Version\/([\d.]+)/],
    [/Firefox\/([\d.]+)/, "Firefox", /Firefox\/([\d.]+)/],
  ];
  for (const [test, name, versionPattern] of checks) {
    if (test.test(ua)) {
      browserName = name;
      browserVersion = ua.match(versionPattern)?.[1] ?? "";
      break;
    }
  }

  return { deviceType, osName, osVersion, browserName, browserVersion };
}

interface AuthEventInput {
  uid?: string | null;
  eventType: "sign_in_start" | "sign_in_success" | "sign_in_failure";
  isNewUser?: boolean | null;
  success: boolean;
  errorMessage?: string | null;
}

/** Fire-and-forget, public endpoint - never throws itself. */
export function logAuthEvent(input: AuthEventInput) {
  const parsed = parseUserAgent(navigator.userAgent);
  fetch(`${API_BASE_URL}/auth-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      ...parsed,
      userAgent: navigator.userAgent,
      url: location.href,
    }),
  }).catch((err) => console.warn("logAuthEvent itself failed:", err));
}
