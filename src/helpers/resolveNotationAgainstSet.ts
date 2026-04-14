import { DiceSet } from "../types/DiceSet";
import {
  NotationComponent,
  isModifierComponent,
  parseNotation,
} from "./notationParser";

export interface ResolvedNotation {
  counts: Record<string, number>;
  bonus: number;
  components: NotationComponent[];
}

export function resolveNotationAgainstSet(
  notation: string,
  diceSet: DiceSet
): ResolvedNotation {
  const components = parseNotation(notation);

  const counts: Record<string, number> = {};
  for (const die of diceSet.dice) {
    counts[die.id] = 0;
  }

  let bonus = 0;

  for (const component of components) {
    if (isModifierComponent(component)) {
      bonus += component.modifier;
      continue;
    }
    const typeStr = `D${component.sides}`;
    const die = diceSet.dice.find((d) => d.type === typeStr);
    if (die) {
      counts[die.id] += component.count;
    }
  }

  return { counts, bonus, components };
}
