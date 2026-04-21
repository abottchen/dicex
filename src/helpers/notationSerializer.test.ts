import { describe, it, expect } from "vitest";
import { serializeNotation, serializeComponents } from "./notationSerializer";
import { parseNotation } from "./notationParser";

describe("serializeNotation", () => {
  it("serializes simple dice: 2d6", () => {
    const result = serializeNotation({ d6: 2 });
    expect(result).toBe("2d6");
  });

  it("serializes dice with bonus: 1d20+5", () => {
    const result = serializeNotation({ d20: 1 }, 5);
    expect(result).toBe("1d20+5");
  });

  it("serializes mixed dice with bonus: 2d6+1d8+3", () => {
    const result = serializeNotation({ d6: 2, d8: 1 }, 3);
    expect(result).toBe("2d6+1d8+3");
  });

  it("omits dice with zero count", () => {
    const result = serializeNotation({ d6: 0, d20: 1 });
    expect(result).toBe("1d20");
  });

  it("omits zero bonus", () => {
    const result = serializeNotation({ d6: 2 }, 0);
    expect(result).toBe("2d6");
  });

  it("round-trips: serialize then parse produces equivalent structure", () => {
    const notation = serializeNotation({ d6: 2, d8: 1 }, 3);
    const parsed = parseNotation(notation);
    expect(parsed).toEqual([
      { count: 2, sides: 6 },
      { count: 1, sides: 8 },
      { modifier: 3 },
    ]);
  });

  it("serializes negative bonus with `-` separator", () => {
    const result = serializeNotation({ d20: 1 }, -3);
    expect(result).toBe("1d20-3");
  });

  it("serializes bonus-only negative notation", () => {
    const result = serializeNotation({}, -5);
    expect(result).toBe("-5");
  });

  it("round-trips negative bonus through parse", () => {
    const notation = serializeNotation({ d20: 1 }, -3);
    const parsed = parseNotation(notation);
    expect(parsed).toEqual([{ count: 1, sides: 20 }, { modifier: -3 }]);
  });
});

describe("serializeComponents", () => {
  it("renders a negative modifier with `-` separator", () => {
    const result = serializeComponents([
      { count: 1, sides: 20 },
      { modifier: -2 },
    ]);
    expect(result).toBe("1d20-2");
  });

  it("renders mixed positive and negative modifiers", () => {
    const result = serializeComponents([
      { count: 1, sides: 20 },
      { modifier: 5 },
      { modifier: -2 },
    ]);
    expect(result).toBe("1d20+5-2");
  });

  it("renders a leading negative modifier", () => {
    const result = serializeComponents([
      { modifier: -3 },
      { count: 1, sides: 20 },
    ]);
    expect(result).toBe("-3+1d20");
  });

  it("round-trips: parse → serialize produces identical notation", () => {
    const cases = ["1d20-2", "1d20+5-2", "-3+1d20", "2d6+1d8-1"];
    for (const notation of cases) {
      expect(serializeComponents(parseNotation(notation))).toBe(notation);
    }
  });
});
