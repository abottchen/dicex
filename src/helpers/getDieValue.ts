import { DiceType } from "../types/DiceType";

/**
 * The effective numeric value of a rolled die face.
 *
 * A ten-sided die shows "0" for a result of 10 (standard d10 convention), so a
 * 0-face D10 counts as 10. Every place that interprets a raw rolled value for
 * comparison, totalling, or display should go through here so the rule is
 * applied consistently — notably both the basic combination path
 * (getCombinedDiceValue) and the advanced keep/drop path (buildDiceResults).
 */
export function getDieValue(type: DiceType, value: number): number {
  if (type === "D10" && value === 0) {
    return 10;
  }
  return value;
}
