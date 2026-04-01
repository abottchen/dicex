import { describe, it, expect } from "vitest";
import { getCombinedDiceValue } from "./getCombinedDiceValue";
import { Dice } from "../types/Dice";
import { Die } from "../types/Die";

function makeDie(id: string, type: string = "D6"): Die {
  return { id, style: "GALAXY" as any, type: type as any };
}

describe("getCombinedDiceValue", () => {
  it("sums values for a simple 2d6 roll", () => {
    const dice: Dice = {
      dice: [makeDie("a"), makeDie("b")],
    };
    const result = getCombinedDiceValue(dice, { a: 3, b: 4 });
    expect(result).toBe(7);
  });

  it("adds bonus to the summed total", () => {
    const dice: Dice = {
      dice: [makeDie("a"), makeDie("b")],
      bonus: 5,
    };
    const result = getCombinedDiceValue(dice, { a: 3, b: 4 });
    expect(result).toBe(12);
  });

  it("returns the highest value plus bonus for HIGHEST combination", () => {
    const dice: Dice = {
      dice: [makeDie("a"), makeDie("b")],
      combination: "HIGHEST",
      bonus: 2,
    };
    const result = getCombinedDiceValue(dice, { a: 5, b: 12 });
    expect(result).toBe(14);
  });

  it("returns the lowest value plus bonus for LOWEST combination", () => {
    const dice: Dice = {
      dice: [makeDie("a"), makeDie("b")],
      combination: "LOWEST",
      bonus: 1,
    };
    const result = getCombinedDiceValue(dice, { a: 5, b: 12 });
    expect(result).toBe(6);
  });

  it("returns just the bonus for NONE combination", () => {
    const dice: Dice = {
      dice: [makeDie("a")],
      combination: "NONE",
      bonus: 7,
    };
    const result = getCombinedDiceValue(dice, { a: 5 });
    expect(result).toBe(7);
  });

  it("returns null when not all die values are present", () => {
    const dice: Dice = {
      dice: [makeDie("a"), makeDie("b")],
    };
    const result = getCombinedDiceValue(dice, { a: 3 });
    expect(result).toBe(3);
  });

  it("returns null when dice array is empty and no bonus", () => {
    const dice: Dice = { dice: [] };
    const result = getCombinedDiceValue(dice, {});
    expect(result).toBeNull();
  });

  it("handles D100 special case: D100=0 and D10=0 returns 100", () => {
    const d100 = makeDie("pct", "D100");
    const d10 = makeDie("tens", "D10");
    const dice: Dice = { dice: [d100, d10] };
    const result = getCombinedDiceValue(dice, { pct: 0, tens: 0 });
    expect(result).toBe(100);
  });

  it("handles D100 normal roll: D100=30, D10=5 returns 35", () => {
    const d100 = makeDie("pct", "D100");
    const d10 = makeDie("tens", "D10");
    const dice: Dice = { dice: [d100, d10] };
    const result = getCombinedDiceValue(dice, { pct: 30, tens: 5 });
    expect(result).toBe(35);
  });

  it("treats D10 value of 0 as 10 in a non-D100 context", () => {
    const d10 = makeDie("a", "D10");
    const dice: Dice = { dice: [d10] };
    const result = getCombinedDiceValue(dice, { a: 0 });
    expect(result).toBe(10);
  });

  it("recursively computes nested Dice structures", () => {
    const inner: Dice = {
      dice: [makeDie("x"), makeDie("y")],
      bonus: 1,
    };
    const outer: Dice = {
      dice: [inner, makeDie("z")],
    };
    // inner = 2 + 3 + 1 = 6; outer = 6 + 4 = 10
    const result = getCombinedDiceValue(outer, { x: 2, y: 3, z: 4 });
    expect(result).toBe(10);
  });
});
