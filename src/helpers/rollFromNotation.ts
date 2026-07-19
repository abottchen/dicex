import { getDiceToRoll, useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { resolveNotationAgainstSet } from "./resolveNotationAgainstSet";

/**
 * Resolve a notation string against the current dice set, wipe any tray
 * state, and start a roll. Returns true iff a roll was started.
 *
 * `hidden` overrides the tray's hidden toggle for this roll only, without
 * modifying it; callers that omit it inherit the user's current setting.
 */
export function rollFromNotation(
  notation: string,
  options?: { hidden?: boolean }
): boolean {
  let resolved;
  try {
    const controls = useDiceControlsStore.getState();
    resolved = resolveNotationAgainstSet(notation, controls.diceSet);
  } catch {
    return false;
  }

  const controls = useDiceControlsStore.getState();
  const { counts, bonus, components } = resolved;

  useDiceRollStore.getState().clearRoll();
  controls.resetDiceCounts();
  controls.setDiceBonus(0);
  controls.setDiceAdvantage(null);
  controls.setActivePresetName(null);
  controls.setActiveNotation(notation);
  controls.setActiveNotationComponents(components);

  const dice = getDiceToRoll(counts, null, controls.diceById);
  if (dice.length === 0) {
    return false;
  }

  useDiceRollStore
    .getState()
    .startRoll({ dice, bonus, hidden: options?.hidden ?? controls.diceHidden }, 1);
  return true;
}
