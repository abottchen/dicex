import { describe, it, expect } from "vitest";
import { resolveNotationAgainstSet } from "./resolveNotationAgainstSet";
import { diceSets } from "../sets/diceSets";

describe("resolveNotationAgainstSet", () => {
  const set = diceSets[0];
  const d20Id = set.dice.find((d) => d.type === "D20")!.id;
  const d6Id = set.dice.find((d) => d.type === "D6")!.id;

  it("maps a single die-group notation to counts by die id", () => {
    const { counts, bonus, components } = resolveNotationAgainstSet(
      "2d6",
      set
    );
    expect(counts[d6Id]).toBe(2);
    expect(bonus).toBe(0);
    expect(components).toHaveLength(1);
  });

  it("accumulates a flat modifier into bonus", () => {
    const { counts, bonus } = resolveNotationAgainstSet("1d20+5", set);
    expect(counts[d20Id]).toBe(1);
    expect(bonus).toBe(5);
  });

  it("returns counts keyed by every die id in the set (others 0)", () => {
    const { counts } = resolveNotationAgainstSet("2d6", set);
    for (const die of set.dice) {
      expect(counts).toHaveProperty(die.id);
    }
    expect(counts[d20Id]).toBe(0);
  });

  it("handles multiple die groups of different types", () => {
    const { counts } = resolveNotationAgainstSet("2d6+1d20", set);
    expect(counts[d6Id]).toBe(2);
    expect(counts[d20Id]).toBe(1);
  });

  it("propagates components so callers can read keep/drop/explode", () => {
    const { components } = resolveNotationAgainstSet("4d6k3", set);
    expect(components).toHaveLength(1);
    expect((components[0] as any).keep).toBe(3);
  });

  it("throws NotationError for invalid notation", () => {
    expect(() => resolveNotationAgainstSet("1d3", set)).toThrow(
      /Invalid die type/
    );
  });
});
