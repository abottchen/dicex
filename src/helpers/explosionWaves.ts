import { Die } from "../types/Die";
import { DiceComponent } from "./notationParser";
import { generateDiceId } from "./generateDiceId";

type ExplodeConfig = NonNullable<DiceComponent["explode"]>;

function shouldExplode(value: number, sides: number, config: ExplodeConfig): boolean {
  switch (config.type) {
    case "max": return value === sides;
    case "gte": return value >= config.value;
    case "exact": return value === config.value;
  }
}

/**
 * Given the dice that just settled and the notation components,
 * return new Die objects for each die that should explode.
 * Only processes dice whose type matches a component with an explode config.
 */
export function getExplosionDice(
  settledDice: { die: Die; value: number }[],
  components: DiceComponent[]
): Die[] {
  const explosionDice: Die[] = [];

  const explodeByType = new Map<string, { sides: number; config: ExplodeConfig }>();
  for (const component of components) {
    if (component.explode) {
      explodeByType.set(`d${component.sides}`, {
        sides: component.sides,
        config: component.explode,
      });
    }
  }

  for (const { die, value } of settledDice) {
    const typeKey = die.type.toLowerCase();
    const explodeInfo = explodeByType.get(typeKey);
    if (!explodeInfo) continue;

    if (shouldExplode(value, explodeInfo.sides, explodeInfo.config)) {
      explosionDice.push({
        id: generateDiceId(),
        style: die.style,
        type: die.type,
        isExplosion: true,
      });
    }
  }

  return explosionDice;
}
