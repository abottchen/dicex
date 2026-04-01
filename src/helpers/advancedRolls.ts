import { DieResult, ModifierResult } from "../types/RollResult";

type ExplodeConfig =
  | { type: "max" }
  | { type: "gte"; value: number }
  | { type: "exact"; value: number };

const MAX_EXPLOSIONS = 100;

function defaultRandom(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function shouldExplode(value: number, sides: number, config: ExplodeConfig): boolean {
  switch (config.type) {
    case "max": return value === sides;
    case "gte": return value >= config.value;
    case "exact": return value === config.value;
  }
}

// TODO: Investigate physics-animated explosions (spawning new 3D dice per explosion) as a future enhancement.
// Currently explosions generate random values without physics simulation.
export function applyExplodingDice(
  dice: DieResult[],
  sides: number,
  config: ExplodeConfig,
  randomFn: (sides: number) => number = defaultRandom
): DieResult[] {
  for (const die of dice) {
    if (shouldExplode(die.value, sides, config)) {
      const explosions: number[] = [];
      let totalExplosions = 0;
      let lastValue = die.value;
      while (shouldExplode(lastValue, sides, config) && totalExplosions < MAX_EXPLOSIONS) {
        const newValue = randomFn(sides);
        explosions.push(newValue);
        lastValue = newValue;
        totalExplosions++;
      }
      if (explosions.length > 0) {
        die.exploded = explosions;
      }
    }
  }
  return dice;
}

export function applyKeepDrop(
  dice: DieResult[],
  rules: { keep?: number; drop?: number }
): DieResult[] {
  const withEffective = dice.map((die, index) => ({
    index,
    effective: die.value + (die.exploded ? die.exploded.reduce((a, b) => a + b, 0) : 0),
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
      if (entry.exploded) {
        total += entry.exploded.reduce((a, b) => a + b, 0);
      }
    }
  }
  return total;
}
