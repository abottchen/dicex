import { DieResult, ModifierResult, RollEntry } from "../types/RollResult";

interface BuildRollEntryInput {
  diceResults: (DieResult | ModifierResult)[];
  total: number;
  notation: string;
  advantage?: "adv" | "dis";
  preset?: string;
}

export function buildRollEntry(input: BuildRollEntryInput): RollEntry {
  const { diceResults, total, notation, advantage, preset } = input;

  const entry: RollEntry = {
    timestamp: new Date().toISOString(),
    notation,
    dice: diceResults,
    total,
  };

  if (advantage) {
    entry.advantage = advantage;
  }

  if (preset) {
    entry.preset = preset;
  }

  return entry;
}
