import { describe, it, expect } from "vitest";
import { parseNotation, NotationError } from "./notationParser";

describe("parseNotation", () => {
  it("parses basic dice: 2d6", () => {
    const result = parseNotation("2d6");
    expect(result).toEqual([{ count: 2, sides: 6 }]);
  });

  it("parses dice with modifier: 1d20+3", () => {
    const result = parseNotation("1d20+3");
    expect(result).toEqual([{ count: 1, sides: 20 }, { modifier: 3 }]);
  });

  it("parses multiple dice types: 2d6+1d8+5", () => {
    const result = parseNotation("2d6+1d8+5");
    expect(result).toEqual([
      { count: 2, sides: 6 },
      { count: 1, sides: 8 },
      { modifier: 5 },
    ]);
  });

  it("handles optional whitespace: 2d6 + 1d8 + 5", () => {
    const result = parseNotation("2d6 + 1d8 + 5");
    expect(result).toEqual([
      { count: 2, sides: 6 },
      { count: 1, sides: 8 },
      { modifier: 5 },
    ]);
  });

  it("parses exploding dice (max): 3d6!", () => {
    const result = parseNotation("3d6!");
    expect(result).toEqual([
      { count: 3, sides: 6, explode: { type: "max" } },
    ]);
  });

  it("parses exploding dice (gte threshold): 3d6!>4", () => {
    const result = parseNotation("3d6!>4");
    expect(result).toEqual([
      { count: 3, sides: 6, explode: { type: "gte", value: 4 } },
    ]);
  });

  it("parses exploding dice (exact): 3d6!3", () => {
    const result = parseNotation("3d6!3");
    expect(result).toEqual([
      { count: 3, sides: 6, explode: { type: "exact", value: 3 } },
    ]);
  });

  it("parses keep highest: 4d6k3", () => {
    const result = parseNotation("4d6k3");
    expect(result).toEqual([{ count: 4, sides: 6, keep: 3 }]);
  });

  it("parses drop lowest: 8d100d3", () => {
    const result = parseNotation("8d100d3");
    expect(result).toEqual([{ count: 8, sides: 100, drop: 3 }]);
  });

  it("parses combination: 2d6!+1d20k1+5", () => {
    const result = parseNotation("2d6!+1d20k1+5");
    expect(result).toEqual([
      { count: 2, sides: 6, explode: { type: "max" } },
      { count: 1, sides: 20, keep: 1 },
      { modifier: 5 },
    ]);
  });

  it("rejects invalid die type: 2d7", () => {
    expect(() => parseNotation("2d7")).toThrow(NotationError);
  });

  it("rejects keep count exceeding dice count: 2d6k3", () => {
    expect(() => parseNotation("2d6k3")).toThrow(NotationError);
  });

  it("rejects drop count exceeding dice count: 2d6d3", () => {
    expect(() => parseNotation("2d6d3")).toThrow(NotationError);
  });

  it("rejects empty string", () => {
    expect(() => parseNotation("")).toThrow(NotationError);
  });

  it("rejects malformed syntax: ddd", () => {
    expect(() => parseNotation("ddd")).toThrow(NotationError);
  });
});
