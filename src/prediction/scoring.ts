import type { ScoringRules } from "../api/backend";

/**
 * Stat categories and the client-side scoring mirror, shared by the
 * prediction flow, its recap views and the leaderboard modal. Moved here
 * unchanged from PredictionScreen.ts so views can import it without a
 * circular dependency.
 */

export type StatCategory = "scorer" | "rebounder" | "assist";

export const CATEGORY_ORDER: StatCategory[] = ["scorer", "rebounder", "assist"];

export const CATEGORY_CONFIG: Record<
  StatCategory,
  {
    labelKey: string;
    playerKey:
      | "topScorerPlayerId"
      | "topRebounderPlayerId"
      | "topAssistPlayerId";
    amountKey: "topScorerPoints" | "topRebounds" | "topAssists";
    amountLabelKey: string;
    actualPlayerKey:
      | "actualTopScorerPlayerId"
      | "actualTopRebounderPlayerId"
      | "actualTopAssistPlayerId";
    actualAmountKey:
      | "actualTopScorerPoints"
      | "actualTopRebounds"
      | "actualTopAssists";
  }
> = {
  scorer: {
    labelKey: "prediction.category.scorer",
    playerKey: "topScorerPlayerId",
    amountKey: "topScorerPoints",
    amountLabelKey: "prediction.category.scorer.amount",
    actualPlayerKey: "actualTopScorerPlayerId",
    actualAmountKey: "actualTopScorerPoints",
  },
  rebounder: {
    labelKey: "prediction.category.rebounder",
    playerKey: "topRebounderPlayerId",
    amountKey: "topRebounds",
    amountLabelKey: "prediction.category.rebounder.amount",
    actualPlayerKey: "actualTopRebounderPlayerId",
    actualAmountKey: "actualTopRebounds",
  },
  assist: {
    labelKey: "prediction.category.assist",
    playerKey: "topAssistPlayerId",
    amountKey: "topAssists",
    amountLabelKey: "prediction.category.assist.amount",
    actualPlayerKey: "actualTopAssistPlayerId",
    actualAmountKey: "actualTopAssists",
  },
};

// Client-side mirror of HapoelJerusalemBackend/scoring.py, used only to show
// a per-row points breakdown in the post-game recap - the real/authoritative
// total score always comes from the server (myGameScore).
export function tieredPoints(
  predicted: number,
  actual: number,
  exact: number,
  closeRange: number,
  close: number,
): number {
  const diff = Math.abs(predicted - actual);
  if (diff === 0) return exact;
  if (diff <= closeRange) return close;
  return 0;
}

export function topStatPoints(
  predictedPlayerId: string | null,
  predictedAmount: number | null,
  actualPlayerId: string | null,
  actualAmount: number | null,
  rules: ScoringRules,
): number {
  if (
    !predictedPlayerId ||
    !actualPlayerId ||
    predictedPlayerId !== actualPlayerId
  )
    return 0;
  let total = rules.topStatPlayerPoints;
  if (predictedAmount !== null && actualAmount !== null) {
    total += tieredPoints(
      predictedAmount,
      actualAmount,
      rules.topStatExactPoints,
      rules.topStatCloseRange,
      rules.topStatClosePoints,
    );
  }
  return total;
}

export function finalScorePoints(
  pHome: number,
  pAway: number,
  aHome: number,
  aAway: number,
  rules: ScoringRules,
): number {
  if (pHome === aHome && pAway === aAway) return rules.finalScoreExactPoints;
  const predictedWinner =
    pHome > pAway ? "home" : pAway > pHome ? "away" : "tie";
  const actualWinner = aHome > aAway ? "home" : aAway > aHome ? "away" : "tie";
  if (predictedWinner !== actualWinner) return 0;
  const marginDiff = Math.abs(pHome - pAway - (aHome - aAway));
  if (marginDiff === 0) return rules.finalScoreMarginPoints;
  if (marginDiff <= rules.finalScoreCloseMarginRange)
    return rules.finalScoreCloseMarginPoints;
  return rules.finalScoreDirectionPoints;
}

export function teamStatPoints(
  predicted: number,
  actual: number,
  rules: ScoringRules,
): number {
  return tieredPoints(
    predicted,
    actual,
    rules.teamStatExactPoints,
    rules.teamStatCloseRange,
    rules.teamStatClosePoints,
  );
}

