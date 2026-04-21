import { NotationComponent, DiceComponent, isModifierComponent } from "./notationParser";

/**
 * Serialize a dice counts map and optional bonus into dice notation.
 * @param diceCounts Map of die type (lowercase, e.g. "d6") to count
 * @param bonus Optional numeric modifier
 * @returns Notation string like "2d6+1d8+3"
 */
export function serializeNotation(
  diceCounts: Record<string, number>,
  bonus?: number
): string {
  const parts: string[] = [];

  // Sort by die size for consistent output
  const entries = Object.entries(diceCounts)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => {
      const sizeA = parseInt(a.replace("d", ""), 10);
      const sizeB = parseInt(b.replace("d", ""), 10);
      return sizeA - sizeB;
    });

  for (const [type, count] of entries) {
    parts.push(`${count}${type}`);
  }

  let result = parts.join("+");

  if (bonus && bonus !== 0) {
    if (result === "") {
      result = `${bonus}`;
    } else if (bonus > 0) {
      result += `+${bonus}`;
    } else {
      result += `${bonus}`;
    }
  }

  return result;
}

/**
 * Serialize parsed notation components back into a notation string,
 * preserving explode/keep/drop modifiers (e.g. "3d6!k2+5", "1d20-2").
 */
export function serializeComponents(components: NotationComponent[]): string {
  let result = "";

  for (const component of components) {
    if (isModifierComponent(component)) {
      if (result === "") {
        result = `${component.modifier}`;
      } else if (component.modifier >= 0) {
        result += `+${component.modifier}`;
      } else {
        result += `${component.modifier}`;
      }
      continue;
    }

    const dc = component as DiceComponent;
    let part = `${dc.count}d${dc.sides}`;

    if (dc.explode) {
      switch (dc.explode.type) {
        case "max":
          part += "!";
          break;
        case "gte":
          part += `!>${dc.explode.value}`;
          break;
        case "exact":
          part += `!${dc.explode.value}`;
          break;
      }
    }

    if (dc.keep !== undefined) {
      part += `k${dc.keep}`;
    }
    if (dc.drop !== undefined) {
      part += `d${dc.drop}`;
    }

    result = result === "" ? part : `${result}+${part}`;
  }

  return result;
}
