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

  // Tokenize into operators (+/-) and term bodies (runs of non-whitespace,
  // non-operator characters). Whitespace is ignored.
  const tokens = notation.match(/[+-]|[^\s+-]+/g) ?? [];
  if (tokens.length === 0) {
    throw new NotationError(`Invalid notation: "${notation}"`);
  }

  const components: NotationComponent[] = [];
  let sign: 1 | -1 = 1;
  let expectTerm = true; // true at start and after each operator
  let seenTerm = false;

  for (const token of tokens) {
    if (token === "+" || token === "-") {
      if (expectTerm && seenTerm) {
        // Compound sign like "1d20+-2" or "1d20-+2"
        throw new NotationError(
          `Invalid notation: compound signs in "${notation}"`
        );
      }
      sign = token === "-" ? -1 : 1;
      expectTerm = true;
      continue;
    }

    if (!expectTerm) {
      throw new NotationError(
        `Invalid notation: missing operator before "${token}" in "${notation}"`
      );
    }

    // Plain numeric modifier
    if (/^\d+$/.test(token)) {
      components.push({ modifier: sign * parseInt(token, 10) });
      sign = 1;
      expectTerm = false;
      seenTerm = true;
      continue;
    }

    if (sign === -1) {
      throw new NotationError(
        `Cannot subtract dice: "-${token}" in "${notation}"`
      );
    }

    const match = DICE_REGEX.exec(token);
    if (!match) {
      throw new NotationError(
        `Invalid dice notation: "${token}" in "${notation}"`
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
            `Keep count (${n}) cannot exceed dice count (${count}) in "${token}"`
          );
        }
        component.keep = n;
      } else {
        // drop
        if (n >= count) {
          throw new NotationError(
            `Drop count (${n}) must be less than dice count (${count}) in "${token}"`
          );
        }
        component.drop = n;
      }
    }

    components.push(component);
    sign = 1;
    expectTerm = false;
    seenTerm = true;
  }

  if (expectTerm) {
    throw new NotationError(
      `Invalid notation: trailing operator in "${notation}"`
    );
  }

  return components;
}
