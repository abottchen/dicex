export class NotationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotationError";
  }
}

export interface DiceComponent {
  count: number;
  sides: number;
  explode?: { type: "max" } | { type: "gte"; value: number } | { type: "exact"; value: number };
  keep?: number;
  drop?: number;
}

export interface ModifierComponent {
  modifier: number;
}

export type NotationComponent = DiceComponent | ModifierComponent;

export function isModifierComponent(
  component: NotationComponent
): component is ModifierComponent {
  return "modifier" in component;
}

const VALID_SIDES = new Set([4, 6, 8, 10, 12, 20, 100]);
const MAX_EXPLODING_DICE = 6;

// Dice regex: count d sides [explode [>value | value]] [k|d count]
const DICE_REGEX = /^(\d+)d(\d+)(!(?:>(\d+)|(\d+))?)?(?:(k|d)(\d+))?$/;

export function parseNotation(notation: string): NotationComponent[] {
  if (!notation || notation.trim() === "") {
    throw new NotationError("Notation cannot be empty");
  }

  const terms = notation.split(/\s*\+\s*/);
  const components: NotationComponent[] = [];

  for (const term of terms) {
    const trimmed = term.trim();
    if (trimmed === "") {
      throw new NotationError(`Invalid notation: empty term in "${notation}"`);
    }

    // Check if it's a plain modifier number
    if (/^\d+$/.test(trimmed)) {
      components.push({ modifier: parseInt(trimmed, 10) });
      continue;
    }

    // Try to match dice pattern
    const match = DICE_REGEX.exec(trimmed);
    if (!match) {
      throw new NotationError(
        `Invalid dice notation: "${trimmed}" in "${notation}"`
      );
    }

    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const explodeRaw = match[3]; // the full explode part including "!"
    const explodeGte = match[4]; // value after "!>"
    const explodeExact = match[5]; // value after "!" (no ">")
    const keepDropChar = match[6]; // "k" or "d"
    const keepDropVal = match[7]; // number after k/d

    if (!VALID_SIDES.has(sides)) {
      throw new NotationError(
        `Invalid die type: d${sides}. Valid sides are: ${[...VALID_SIDES].join(", ")}`
      );
    }

    const component: DiceComponent = { count, sides };

    if (explodeRaw !== undefined) {
      if (explodeGte !== undefined) {
        component.explode = { type: "gte", value: parseInt(explodeGte, 10) };
      } else if (explodeExact !== undefined) {
        component.explode = { type: "exact", value: parseInt(explodeExact, 10) };
      } else {
        component.explode = { type: "max" };
      }
    }

    // Cap dice count for exploding rolls to leave room for explosion waves
    if (component.explode && component.count > MAX_EXPLODING_DICE) {
      component.count = MAX_EXPLODING_DICE;
    }

    if (keepDropChar !== undefined && keepDropVal !== undefined) {
      const n = parseInt(keepDropVal, 10);
      if (keepDropChar === "k") {
        if (n > count) {
          throw new NotationError(
            `Keep count (${n}) cannot exceed dice count (${count}) in "${trimmed}"`
          );
        }
        component.keep = n;
      } else {
        // drop
        if (n >= count) {
          throw new NotationError(
            `Drop count (${n}) must be less than dice count (${count}) in "${trimmed}"`
          );
        }
        component.drop = n;
      }
    }

    components.push(component);
  }

  return components;
}
