import { describe, it, expect } from "vitest";
import { applyKeepDrop, calculateTotal } from "./advancedRolls";
import { DieResult, ModifierResult } from "../types/RollResult";

describe("applyKeepDrop", () => {
  it("keeps highest 3 from 4d6", () => {
    const dice: DieResult[] = [
      { type: "d6", value: 5 },
      { type: "d6", value: 2 },
      { type: "d6", value: 4 },
      { type: "d6", value: 6 },
    ];
    const result = applyKeepDrop(dice, { keep: 3 });
    const dropped = result.filter((d) => d.dropped);
    expect(dropped).toHaveLength(1);
    expect(dropped[0].value).toBe(2);
  });

  it("drops lowest 3 from 8d100", () => {
    const dice: DieResult[] = [
      { type: "d100", value: 84 },
      { type: "d100", value: 12 },
      { type: "d100", value: 55 },
      { type: "d100", value: 7 },
      { type: "d100", value: 91 },
      { type: "d100", value: 3 },
      { type: "d100", value: 67 },
      { type: "d100", value: 45 },
    ];
    const result = applyKeepDrop(dice, { drop: 3 });
    const dropped = result.filter((d) => d.dropped);
    expect(dropped).toHaveLength(3);
    const droppedValues = dropped.map((d) => d.value).sort((a, b) => a - b);
    expect(droppedValues).toEqual([3, 7, 12]);
  });

  it("keeps highest 1 from 2d20 (advantage equivalent)", () => {
    const dice: DieResult[] = [
      { type: "d20", value: 15 },
      { type: "d20", value: 4 },
    ];
    const result = applyKeepDrop(dice, { keep: 1 });
    expect(result.find((d) => d.value === 4)?.dropped).toBe(true);
    expect(result.find((d) => d.value === 15)?.dropped).toBeUndefined();
  });
});

describe("applyKeepDrop (edge cases)", () => {
  it("does not drop any dice when neither keep nor drop is specified", () => {
    const dice: DieResult[] = [
      { type: "d6", value: 3 },
      { type: "d6", value: 5 },
    ];
    const result = applyKeepDrop(dice, {});
    expect(result.every((d) => !d.dropped)).toBe(true);
  });
});

describe("calculateTotal", () => {
  it("returns 0 for an empty array", () => {
    expect(calculateTotal([])).toBe(0);
  });

  it("returns the modifier value when only a modifier entry is present", () => {
    const dice: (DieResult | ModifierResult)[] = [{ type: "mod", value: 7 }];
    expect(calculateTotal(dice)).toBe(7);
  });

  it("sums non-dropped dice plus modifiers", () => {
    const dice: (DieResult | ModifierResult)[] = [
      { type: "d6", value: 6 },
      { type: "d6", value: 2, dropped: true },
      { type: "d6", value: 4 },
      { type: "mod", value: 5 },
    ];
    expect(calculateTotal(dice)).toBe(15);
  });

  it("excludes dropped dice from total", () => {
    const dice: DieResult[] = [
      { type: "d6", value: 6, dropped: true },
      { type: "d6", value: 4 },
    ];
    expect(calculateTotal(dice)).toBe(4);
  });

  it("sums basic dice with modifier", () => {
    const dice: (DieResult | ModifierResult)[] = [
      { type: "d20", value: 15 },
      { type: "mod", value: 3 },
    ];
    expect(calculateTotal(dice)).toBe(18);
  });
});
