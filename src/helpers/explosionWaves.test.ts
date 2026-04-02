import { describe, it, expect } from "vitest";
import { getExplosionDice } from "./explosionWaves";
import { Die } from "../types/Die";
import { DiceComponent } from "./notationParser";

describe("getExplosionDice", () => {
  it("returns explosion dice for dice that hit max value on a d6", () => {
    const settledDice: { die: Die; value: number }[] = [
      { die: { id: "d1", style: "IRON" as any, type: "D6" as any }, value: 6 },
      { die: { id: "d2", style: "IRON" as any, type: "D6" as any }, value: 3 },
    ];
    const components: DiceComponent[] = [
      { count: 2, sides: 6, explode: { type: "max" } },
    ];

    const result = getExplosionDice(settledDice, components);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("D6");
    expect(result[0].style).toBe("IRON");
    expect(result[0].isExplosion).toBe(true);
  });

  it("returns empty array when no dice explode", () => {
    const settledDice: { die: Die; value: number }[] = [
      { die: { id: "d1", style: "IRON" as any, type: "D6" as any }, value: 3 },
    ];
    const components: DiceComponent[] = [
      { count: 1, sides: 6, explode: { type: "max" } },
    ];

    const result = getExplosionDice(settledDice, components);
    expect(result).toHaveLength(0);
  });

  it("returns empty array when components have no explode config", () => {
    const settledDice: { die: Die; value: number }[] = [
      { die: { id: "d1", style: "IRON" as any, type: "D6" as any }, value: 6 },
    ];
    const components: DiceComponent[] = [
      { count: 1, sides: 6 },
    ];

    const result = getExplosionDice(settledDice, components);
    expect(result).toHaveLength(0);
  });

  it("handles gte explosion threshold", () => {
    const settledDice: { die: Die; value: number }[] = [
      { die: { id: "d1", style: "IRON" as any, type: "D6" as any }, value: 5 },
      { die: { id: "d2", style: "IRON" as any, type: "D6" as any }, value: 3 },
    ];
    const components: DiceComponent[] = [
      { count: 2, sides: 6, explode: { type: "gte", value: 5 } },
    ];

    const result = getExplosionDice(settledDice, components);
    expect(result).toHaveLength(1);
  });

  it("handles exact explosion value", () => {
    const settledDice: { die: Die; value: number }[] = [
      { die: { id: "d1", style: "IRON" as any, type: "D6" as any }, value: 3 },
      { die: { id: "d2", style: "IRON" as any, type: "D6" as any }, value: 4 },
    ];
    const components: DiceComponent[] = [
      { count: 2, sides: 6, explode: { type: "exact", value: 3 } },
    ];

    const result = getExplosionDice(settledDice, components);
    expect(result).toHaveLength(1);
  });

  it("only checks dice that match the component's die type", () => {
    const settledDice: { die: Die; value: number }[] = [
      { die: { id: "d1", style: "IRON" as any, type: "D6" as any }, value: 6 },
      { die: { id: "d2", style: "IRON" as any, type: "D8" as any }, value: 8 },
    ];
    const components: DiceComponent[] = [
      { count: 1, sides: 6, explode: { type: "max" } },
      { count: 1, sides: 8 },
    ];

    const result = getExplosionDice(settledDice, components);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("D6");
  });

  it("generates unique IDs for explosion dice", () => {
    const settledDice: { die: Die; value: number }[] = [
      { die: { id: "d1", style: "IRON" as any, type: "D6" as any }, value: 6 },
      { die: { id: "d2", style: "IRON" as any, type: "D6" as any }, value: 6 },
    ];
    const components: DiceComponent[] = [
      { count: 2, sides: 6, explode: { type: "max" } },
    ];

    const result = getExplosionDice(settledDice, components);
    expect(result).toHaveLength(2);
    expect(result[0].id).not.toBe(result[1].id);
  });
});
