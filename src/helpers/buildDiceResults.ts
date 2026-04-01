import { DieResult, ModifierResult } from "../types/RollResult";
import { DiceRoll } from "../types/DiceRoll";
import { Die } from "../types/Die";
import { getDieFromDice } from "./getDieFromDice";
import { getCombinedDiceValue } from "./getCombinedDiceValue";
import { applyExplodingDice, applyKeepDrop, calculateTotal } from "./advancedRolls";
import { NotationComponent, DiceComponent, isModifierComponent } from "./notationParser";

export interface ProcessedRollResult {
  dice: (DieResult | ModifierResult)[];
  total: number;
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

  // Check if we have advanced notation components (explode/keep/drop)
  const diceComponents = activeNotationComponents?.filter(
    (c): c is DiceComponent => !isModifierComponent(c)
  ) ?? [];
  const hasAdvanced = diceComponents.some(
    (c) => c.explode || c.keep !== undefined || c.drop !== undefined
  );

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

  // Map physical dice to their notation components by type and order
  // Each DiceComponent describes a group (e.g., 3d6! means 3 dice of d6 with explode)
  let diceIndex = 0;
  for (const component of diceComponents) {
    const groupDice: DieResult[] = [];
    for (let i = 0; i < component.count && diceIndex < allDice.length; i++) {
      const die = allDice[diceIndex];
      // Skip dice that don't match the expected type (e.g., advantage doubles)
      // For advantage rolls, the physical dice structure is nested, but getDieFromDice
      // flattens them. We match by type.
      if (die.type.toLowerCase() === `d${component.sides}`) {
        groupDice.push({
          type: die.type.toLowerCase(),
          value: rollValues[die.id],
        });
        diceIndex++;
      } else {
        // Type mismatch — this die might belong to a different component or advantage structure
        // Skip to find the right dice
        diceIndex++;
        i--; // retry this component slot
      }
    }

    // Apply exploding dice
    if (component.explode && groupDice.length > 0) {
      applyExplodingDice(groupDice, component.sides, component.explode);
    }

    // Apply keep/drop
    if ((component.keep !== undefined || component.drop !== undefined) && groupDice.length > 0) {
      applyKeepDrop(groupDice, {
        keep: component.keep,
        drop: component.drop,
      });
    }

    diceResults.push(...groupDice);
  }

  // Add any remaining dice that weren't matched (safety net)
  while (diceIndex < allDice.length) {
    const die = allDice[diceIndex];
    diceResults.push({
      type: die.type.toLowerCase(),
      value: rollValues[die.id],
    });
    diceIndex++;
  }

  if (bonus !== 0) {
    diceResults.push({ type: "mod", value: bonus });
  }

  const total = calculateTotal(diceResults);

  return {
    dice: diceResults,
    total,
    advantage,
    notation: activeNotation ?? undefined,
    presetName: activePresetName ?? undefined,
  };
}
