import { ProcessedRollResult } from "../helpers/buildDiceResults";
import {
  NotationComponent,
  DiceComponent,
  isModifierComponent,
} from "../helpers/notationParser";
import { DieResult, ModifierResult } from "../types/RollResult";
import { serializeComponents } from "../helpers/notationSerializer";
import {
  DicePlusGroup,
  DicePlusResult,
} from "./dicePlusProtocol";

function isMod(entry: DieResult | ModifierResult): entry is ModifierResult {
  return entry.type === "mod";
}

function describeDiceComponent(component: DiceComponent): string {
  return serializeComponents([component]);
}

/**
 * Convert a dicex ProcessedRollResult into the Dice+ result wire format.
 * The components array MUST come from the same notation that was rolled —
 * we use it to determine group boundaries, dice-type labels, and explode markers.
 */
export function buildDicePlusResult(
  processed: ProcessedRollResult,
  components: NotationComponent[]
): DicePlusResult {
  const groups: DicePlusGroup[] = [];
  const allEntries = processed.dice;
  let cursor = 0;

  for (const component of components) {
    if (isModifierComponent(component)) {
      const value = component.modifier;
      const isNegative = value < 0;
      const absValue = Math.abs(value);
      groups.push({
        description: isNegative ? `${value}` : `+${value}`,
        diceType: "mod",
        dice: [{ value: absValue, kept: true }],
        total: absValue,
        isNegative,
      });
      // Modifier entry in `processed.dice` (if present) lives at the tail.
      // We don't advance cursor here; we'll skip the trailing mod entry below.
      continue;
    }

    const dc = component as DiceComponent;
    const expectedType = `d${dc.sides}`;
    const groupDice: { value: number; kept: boolean }[] = [];
    let groupTotal = 0;

    while (cursor < allEntries.length) {
      const entry = allEntries[cursor];
      if (isMod(entry)) break;
      if (entry.type !== expectedType) break;
      const isExplosion = entry.isExplosion === true;
      const isOriginalSlotFilled =
        groupDice.filter((d) => true).length >= dc.count;
      // Original dice fill first; any remaining same-type entries that are
      // explosion dice continue to belong to this group.
      if (isOriginalSlotFilled && !isExplosion) break;

      const kept = entry.dropped !== true;
      groupDice.push({ value: entry.value, kept });
      if (kept) groupTotal += entry.value;
      cursor++;
    }

    groups.push({
      description: describeDiceComponent(dc),
      diceType: expectedType,
      dice: groupDice,
      total: groupTotal,
      isNegative: false,
    });
  }

  // Build human-readable summary: per-group totals joined by + / -, then "= total".
  let summary = "";
  for (const group of groups) {
    const sep = summary === "" ? "" : group.isNegative ? " - " : " + ";
    summary += `${sep}${group.total}`;
  }
  if (summary === "") summary = `${processed.total}`;
  summary += ` = ${processed.total}`;

  return {
    totalValue: processed.total,
    rollSummary: summary,
    groups,
  };
}
