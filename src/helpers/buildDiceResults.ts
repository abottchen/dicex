import { DieResult, ModifierResult } from "../types/RollResult";
import { DiceRoll } from "../types/DiceRoll";
import { Die } from "../types/Die";
import { getDieFromDice } from "./getDieFromDice";
import { getCombinedDiceValue } from "./getCombinedDiceValue";
import { applyKeepDrop, calculateTotal } from "./advancedRolls";
import { getDieValue } from "./getDieValue";
import {
  NotationComponent,
  DiceComponent,
  isModifierComponent,
  hasAdvancedComponents,
} from "./notationParser";

export interface ProcessedRollResult {
  dice: (DieResult | ModifierResult)[];
  total: number;
  /**
   * Ids of the physical dice excluded by keep/drop rules. Used by the live
   * breakdown UI to strike dropped dice while still drawing the real dice
   * (which carry style/type). Empty for basic rolls. In-memory only — kept
   * off the persisted `dice` array, which stays id-less. Typed as a plain
   * array (not a Set) so the result stays JSON-clean next to wire/log data.
   */
  droppedIds: string[];
  advantage?: "adv" | "dis";
  notation?: string;
  presetName?: string;
}

interface BuildDiceResultsInput {
  roll: DiceRoll;
  rollValues: Record<string, number>;
  activeNotation?: string | null;
  activePresetName?: string | null;
  activeNotationComponents?: NotationComponent[] | null;
}

/**
 * Build processed dice results from a completed roll.
 * Applies advanced roll mechanics (exploding, keep/drop) if notation components are present.
 */
export function buildDiceResults(input: BuildDiceResultsInput): ProcessedRollResult {
  const { roll, rollValues, activeNotation, activePresetName, activeNotationComponents } = input;

  const allDice = getDieFromDice(roll);

  // Detect advantage/disadvantage from roll structure
  const hasHighest = roll.dice.some(
    (d) => "combination" in d && d.combination === "HIGHEST"
  );
  const hasLowest = roll.dice.some(
    (d) => "combination" in d && d.combination === "LOWEST"
  );
  const advantage = hasHighest
    ? ("adv" as const)
    : hasLowest
    ? ("dis" as const)
    : undefined;

  const bonus = roll.bonus ?? 0;

  // Check if we have advanced notation components (explode/keep/keepLowest/drop)
  const diceComponents = activeNotationComponents?.filter(
    (c): c is DiceComponent => !isModifierComponent(c)
  ) ?? [];
  const hasAdvanced = hasAdvancedComponents(activeNotationComponents);

  if (hasAdvanced) {
    return buildAdvancedResults(allDice, rollValues, diceComponents, bonus, advantage, activeNotation, activePresetName);
  }

  return buildBasicResults(allDice, roll, rollValues, bonus, advantage, activeNotation, activePresetName);
}

function buildBasicResults(
  allDice: Die[],
  roll: DiceRoll,
  rollValues: Record<string, number>,
  bonus: number,
  advantage: "adv" | "dis" | undefined,
  activeNotation?: string | null,
  activePresetName?: string | null,
): ProcessedRollResult {
  // NB: per-die value is the raw rolled face — a d10 records 0 for a face of
  // 10. We deliberately do NOT apply getDieValue here: a d10 can be the ones
  // digit of a d100 percentile pair, where 0 genuinely means 0. The *total*
  // below (getCombinedDiceValue) interprets faces correctly (10 for a standalone
  // d10's 0; 0 for a percentile ones digit). See getDieValue / checkD100Combination.
  const diceResults: (DieResult | ModifierResult)[] = allDice.map((die) => ({
    type: die.type.toLowerCase(),
    value: rollValues[die.id],
  }));

  if (bonus !== 0) {
    diceResults.push({ type: "mod", value: bonus });
  }

  const total = getCombinedDiceValue(roll, rollValues);

  return {
    dice: diceResults,
    total: total ?? 0,
    droppedIds: [],
    advantage,
    notation: activeNotation ?? undefined,
    presetName: activePresetName ?? undefined,
  };
}

function buildAdvancedResults(
  allDice: Die[],
  rollValues: Record<string, number>,
  diceComponents: DiceComponent[],
  bonus: number,
  advantage: "adv" | "dis" | undefined,
  activeNotation?: string | null,
  activePresetName?: string | null,
): ProcessedRollResult {
  const diceResults: (DieResult | ModifierResult)[] = [];
  const droppedIds: string[] = [];

  // KNOWN LIMITATION: d100 + keep/drop/explode (e.g. "2d100kl1") is not
  // supported here and produces incorrect results. A d100 roll is a nested
  // {D100, D10} percentile pair, but this matcher keys purely on die type/order:
  // it matches the D100 faces against the component and orphans the percentile
  // D10s, so keep/drop selects on the tens-digit alone rather than the combined
  // 1-100 value. Plain d100 rolls are unaffected (they go through
  // getCombinedDiceValue.checkD100Combination, not this path). Fixing this needs
  // percentile pairs combined before keep/drop is applied — tracked separately.
  //
  // Map physical dice to their notation components by type and order
  // Each DiceComponent describes a group (e.g., 3d6! means 3 dice of d6 with explode)
  let diceIndex = 0;
  for (const component of diceComponents) {
    const groupDice: DieResult[] = [];
    // Physical die backing each groupDice entry, kept parallel so a die marked
    // dropped by applyKeepDrop can be traced back to its id.
    const groupDie: Die[] = [];
    for (let i = 0; i < component.count && diceIndex < allDice.length; i++) {
      const die = allDice[diceIndex];
      // Skip dice that don't match the expected type (e.g., advantage doubles)
      // For advantage rolls, the physical dice structure is nested, but getDieFromDice
      // flattens them. We match by type.
      if (die.type.toLowerCase() === `d${component.sides}`) {
        const result: DieResult = {
          type: die.type.toLowerCase(),
          value: getDieValue(die.type, rollValues[die.id]),
        };
        if (die.isExplosion) result.isExplosion = true;
        groupDice.push(result);
        groupDie.push(die);
        diceIndex++;
      } else {
        // Type mismatch — this die might belong to a different component or advantage structure
        // Skip to find the right dice
        diceIndex++;
        i--; // retry this component slot
      }
    }

    // Apply keep/drop
    if ((component.keep !== undefined || component.keepLowest !== undefined || component.drop !== undefined) && groupDice.length > 0) {
      applyKeepDrop(groupDice, {
        keep: component.keep,
        keepLowest: component.keepLowest,
        drop: component.drop,
      });
      // Project the single keep/drop decision onto the id-keyed view.
      groupDice.forEach((d, i) => {
        if (d.dropped) droppedIds.push(groupDie[i].id);
      });
    }

    diceResults.push(...groupDice);
  }

  // Add any remaining dice that weren't matched (safety net)
  while (diceIndex < allDice.length) {
    const die = allDice[diceIndex];
    const result: DieResult = {
      type: die.type.toLowerCase(),
      value: getDieValue(die.type, rollValues[die.id]),
    };
    if (die.isExplosion) result.isExplosion = true;
    diceResults.push(result);
    diceIndex++;
  }

  if (bonus !== 0) {
    diceResults.push({ type: "mod", value: bonus });
  }

  const total = calculateTotal(diceResults);

  return {
    dice: diceResults,
    total,
    droppedIds,
    advantage,
    notation: activeNotation ?? undefined,
    presetName: activePresetName ?? undefined,
  };
}
