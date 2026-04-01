import { describe, it, expect } from "vitest";
import { serializeNotation } from "../notationSerializer";
import { parseNotation } from "../notationParser";

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
});
