import { describe, it, expect } from "vitest";
import { getDieFromDice } from "./getDieFromDice";
import { Dice } from "../types/Dice";
import { Die } from "../types/Die";

function makeDie(id: string): Die {
  return { id, style: "GALAXY" as any, type: "D6" as any };
}

describe("getDieFromDice", () => {
  it("returns all dice from a flat array of Die", () => {
    const dice: Dice = {
      dice: [makeDie("a"), makeDie("b")],
    };
    const result = getDieFromDice(dice);
    expect(result).toHaveLength(2);
    expect(result.map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("flattens nested Dice structures recursively", () => {
    const inner: Dice = { dice: [makeDie("inner-1"), makeDie("inner-2")] };
    const outer: Dice = { dice: [inner] };
    const result = getDieFromDice(outer);
    expect(result).toHaveLength(2);
    expect(result.map((d) => d.id)).toEqual(["inner-1", "inner-2"]);
  });

  it("handles mixed Die and nested Dice in the same array", () => {
    const inner: Dice = { dice: [makeDie("nested-1")] };
    const outer: Dice = { dice: [makeDie("top-1"), inner, makeDie("top-2")] };
    const result = getDieFromDice(outer);
    expect(result).toHaveLength(3);
    expect(result.map((d) => d.id)).toEqual(["top-1", "nested-1", "top-2"]);
  });

  it("returns empty array when dice array is empty", () => {
    const dice: Dice = { dice: [] };
    const result = getDieFromDice(dice);
    expect(result).toEqual([]);
  });
});
