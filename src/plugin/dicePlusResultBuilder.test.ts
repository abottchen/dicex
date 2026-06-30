import { describe, it, expect } from "vitest";
import { buildDicePlusResult } from "./dicePlusResultBuilder";
import { ProcessedRollResult } from "../helpers/buildDiceResults";
import { NotationComponent } from "../helpers/notationParser";

describe("buildDicePlusResult", () => {
  it("builds groups for simple 1d20+5", () => {
    const components: NotationComponent[] = [
      { count: 1, sides: 20 },
      { modifier: 5 },
    ];
    const processed: ProcessedRollResult = {
      dice: [{ type: "d20", value: 12 }, { type: "mod", value: 5 }],
      total: 17,
      droppedIds: [],
    };
    const result = buildDicePlusResult(processed, components);

    expect(result.totalValue).toBe(17);
    expect(result.groups).toEqual([
      {
        description: "1d20",
        diceType: "d20",
        dice: [{ value: 12, kept: true }],
        total: 12,
        isNegative: false,
      },
      {
        description: "+5",
        diceType: "mod",
        dice: [{ value: 5, kept: true }],
        total: 5,
        isNegative: false,
      },
    ]);
    expect(result.rollSummary).toBe("12 + 5 = 17");
  });

  it("encodes negative modifier as isNegative", () => {
    const components: NotationComponent[] = [
      { count: 1, sides: 20 },
      { modifier: -2 },
    ];
    const processed: ProcessedRollResult = {
      dice: [{ type: "d20", value: 8 }, { type: "mod", value: -2 }],
      total: 6,
      droppedIds: [],
    };
    const result = buildDicePlusResult(processed, components);

    expect(result.groups[1]).toEqual({
      description: "-2",
      diceType: "mod",
      dice: [{ value: 2, kept: true }],
      total: 2,
      isNegative: true,
    });
    expect(result.rollSummary).toBe("8 - 2 = 6");
  });

  it("marks dropped dice as kept: false and excludes them from group total", () => {
    const components: NotationComponent[] = [{ count: 4, sides: 6, keep: 3 }];
    const processed: ProcessedRollResult = {
      dice: [
        { type: "d6", value: 6 },
        { type: "d6", value: 5 },
        { type: "d6", value: 4 },
        { type: "d6", value: 1, dropped: true },
      ],
      total: 15,
      droppedIds: [],
    };
    const result = buildDicePlusResult(processed, components);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].description).toBe("4d6k3");
    expect(result.groups[0].dice).toEqual([
      { value: 6, kept: true },
      { value: 5, kept: true },
      { value: 4, kept: true },
      { value: 1, kept: false },
    ]);
    expect(result.groups[0].total).toBe(15);
  });

  it("handles multiple dice groups: 2d6+1d8", () => {
    const components: NotationComponent[] = [
      { count: 2, sides: 6 },
      { count: 1, sides: 8 },
    ];
    const processed: ProcessedRollResult = {
      dice: [
        { type: "d6", value: 3 },
        { type: "d6", value: 5 },
        { type: "d8", value: 7 },
      ],
      total: 15,
      droppedIds: [],
    };
    const result = buildDicePlusResult(processed, components);

    expect(result.groups.map((g) => g.diceType)).toEqual(["d6", "d8"]);
    expect(result.groups[0].total).toBe(8);
    expect(result.groups[1].total).toBe(7);
    expect(result.rollSummary).toBe("8 + 7 = 15");
  });

  it("includes explosion dice in the same group as their parent", () => {
    const components: NotationComponent[] = [
      { count: 2, sides: 6, explode: { type: "max" } },
    ];
    const processed: ProcessedRollResult = {
      dice: [
        { type: "d6", value: 6 },
        { type: "d6", value: 4 },
        { type: "d6", value: 3, isExplosion: true },
      ],
      total: 13,
      droppedIds: [],
    };
    const result = buildDicePlusResult(processed, components);

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].description).toBe("2d6!");
    expect(result.groups[0].dice).toHaveLength(3);
    expect(result.groups[0].total).toBe(13);
  });
});
