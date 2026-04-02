import { DieResult, ModifierResult } from "../types/RollResult";

export function applyKeepDrop(
  dice: DieResult[],
  rules: { keep?: number; drop?: number }
): DieResult[] {
  const withEffective = dice.map((die, index) => ({
    index,
    effective: die.value,
  }));
  const sorted = [...withEffective].sort((a, b) => a.effective - b.effective);

  let dropCount = 0;
  if (rules.keep !== undefined) {
    dropCount = dice.length - rules.keep;
  } else if (rules.drop !== undefined) {
    dropCount = rules.drop;
  }

  const droppedIndices = new Set(sorted.slice(0, dropCount).map((s) => s.index));
  for (let i = 0; i < dice.length; i++) {
    if (droppedIndices.has(i)) {
      dice[i].dropped = true;
    }
  }
  return dice;
}

function isModifier(entry: DieResult | ModifierResult): entry is ModifierResult {
  return entry.type === "mod";
}

export function calculateTotal(dice: (DieResult | ModifierResult)[]): number {
  let total = 0;
  for (const entry of dice) {
    if (isModifier(entry)) {
      total += entry.value;
    } else if (!entry.dropped) {
      total += entry.value;
    }
  }
  return total;
}
