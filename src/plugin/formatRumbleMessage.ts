import { DieResult, ModifierResult } from "../types/RollResult";

interface FormatRumbleMessageOptions {
  playerName: string;
  dice: (DieResult | ModifierResult)[];
  total: number;
  advantage?: "adv" | "dis";
  presetName?: string;
  notation?: string;
  hidden?: boolean;
}

/** Returns true if any die in the array has exploded or dropped properties set */
function hasAdvancedDiceProps(dice: (DieResult | ModifierResult)[]): boolean {
  return dice.some(
    (d) =>
      d.type !== "mod" &&
      ((d as DieResult).exploded !== undefined ||
        (d as DieResult).dropped === true)
  );
}

/**
 * Expand a DieResult into comma-separated bracket entries.
 * - Exploded dice: 💥 prefix
 * - Dropped dice: 🚫 prefix
 * - Nat 20 on d20: ⭐ prefix
 * - Nat 1 on d20: 💀 prefix
 */
function expandDieValues(die: DieResult): string[] {
  const parts: string[] = [];
  const isD20 = die.type === "d20";

  if (die.dropped) {
    parts.push(`[🚫${die.value}]`);
  } else if (die.exploded && die.exploded.length > 0) {
    parts.push(`[💥${die.value}]`);
    for (const v of die.exploded) {
      parts.push(`[${v}]`);
    }
  } else if (isD20 && die.value === 20) {
    parts.push(`[⭐20]`);
  } else if (isD20 && die.value === 1) {
    parts.push(`[💀1]`);
  } else {
    parts.push(`[${die.value}]`);
  }
  return parts;
}

/**
 * Format a group of consecutive same-type dice into a notation+values segment.
 */
function formatDiceGroup(
  type: string,
  dieFaces: DieResult[],
  labelOverride?: string
): string {
  const count = dieFaces.length;
  const label = labelOverride ?? `${count}${type}`;
  const values = dieFaces.flatMap(expandDieValues).join(", ");
  return `${label} \u2192 ${values}`;
}

export function formatRumbleMessage({
  playerName,
  dice,
  total,
  advantage,
  presetName,
  notation,
  hidden,
}: FormatRumbleMessageOptions): string {
  // Separate modifiers from dice
  const modifiers = dice.filter((d): d is ModifierResult => d.type === "mod");
  const dieFaces = dice.filter((d): d is DieResult => d.type !== "mod");

  const advanced = hasAdvancedDiceProps(dice);

  // Group consecutive dice by type
  const groups: { type: string; dice: DieResult[] }[] = [];
  for (const die of dieFaces) {
    const last = groups[groups.length - 1];
    if (last && last.type === die.type) {
      last.dice.push(die);
    } else {
      groups.push({ type: die.type, dice: [die] });
    }
  }

  // When there's advanced notation (exploded/dropped) and exactly one dice
  // group, use the notation string as the label.
  const useNotationLabel = advanced && notation !== undefined && groups.length === 1;

  const groupSegments = groups.map((g, i) => {
    const label = useNotationLabel && i === 0 ? notation : undefined;
    return formatDiceGroup(g.type, g.dice, label);
  });

  // Build the inner expression
  let inner = groupSegments.join(", ");

  // Append advantage/disadvantage suffix
  if (advantage) {
    inner += ` ${advantage}`;
  }

  // Append modifier inline after advantage
  if (modifiers.length > 0) {
    const modTotal = modifiers.reduce((sum, m) => sum + m.value, 0);
    const sign = modTotal >= 0 ? "+" : "";
    inner += ` ${sign}${modTotal}`;
  }

  const hiddenPrefix = hidden ? "\uD83D\uDD12 " : "";
  const rollVerb = presetName
    ? `used [${presetName}] and rolled`
    : "rolled";

  return `${hiddenPrefix}${playerName} ${rollVerb} (${inner}) for **${total}**!`;
}
