import { describe, it, expect } from "vitest";
import { buildRollEntry } from "./buildRollEntry";

describe("buildRollEntry", () => {
  it("builds a basic roll entry", () => {
    const entry = buildRollEntry({
      diceResults: [{ type: "d20", value: 15 }],
      total: 15,
      notation: "1d20",
    });
    expect(entry.notation).toBe("1d20");
    expect(entry.dice).toEqual([{ type: "d20", value: 15 }]);
    expect(entry.total).toBe(15);
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.advantage).toBeUndefined();
    expect(entry.preset).toBeUndefined();
  });

  it("builds a roll entry with modifier", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d4", value: 2 },
        { type: "d4", value: 4 },
        { type: "d4", value: 1 },
        { type: "mod", value: 3 },
      ],
      total: 10,
      notation: "3d4+3",
    });
    expect(entry.dice).toEqual([
      { type: "d4", value: 2 },
      { type: "d4", value: 4 },
      { type: "d4", value: 1 },
      { type: "mod", value: 3 },
    ]);
    expect(entry.total).toBe(10);
  });

  it("builds an advantage roll entry", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d20", value: 15 },
        { type: "d20", value: 4 },
      ],
      total: 15,
      notation: "2d20",
      advantage: "adv",
    });
    expect(entry.advantage).toBe("adv");
    expect(entry.total).toBe(15);
  });

  it("builds a disadvantage roll entry", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d20", value: 15 },
        { type: "d20", value: 4 },
      ],
      total: 4,
      notation: "2d20",
      advantage: "dis",
    });
    expect(entry.advantage).toBe("dis");
    expect(entry.total).toBe(4);
  });

  it("builds an exploding dice entry", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d6", value: 6 },
        { type: "d6", value: 3 },
        { type: "d6", value: 6 },
        { type: "d6", value: 4, isExplosion: true },
        { type: "d6", value: 2, isExplosion: true },
      ],
      total: 21,
      notation: "3d6!",
      preset: "Chaos Bolt",
    });
    expect(entry.dice[3]).toEqual({ type: "d6", value: 4, isExplosion: true });
    expect(entry.dice[4]).toEqual({ type: "d6", value: 2, isExplosion: true });
    expect(entry.total).toBe(21);
    expect(entry.preset).toBe("Chaos Bolt");
  });

  it("builds a keep entry with dropped dice", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d6", value: 5 },
        { type: "d6", value: 2, dropped: true },
        { type: "d6", value: 4 },
        { type: "d6", value: 6 },
      ],
      total: 15,
      notation: "4d6k3",
    });
    expect(entry.dice[1]).toEqual({ type: "d6", value: 2, dropped: true });
    expect(entry.total).toBe(15);
  });

  it("builds a drop entry with multiple dropped dice", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d100", value: 84 },
        { type: "d100", value: 12, dropped: true },
        { type: "d100", value: 55 },
        { type: "d100", value: 7, dropped: true },
        { type: "d100", value: 91 },
        { type: "d100", value: 3, dropped: true },
        { type: "d100", value: 67 },
        { type: "d100", value: 45 },
      ],
      total: 342,
      notation: "8d100d3",
    });
    const dropped = entry.dice.filter(
      (d) => "dropped" in d && d.dropped
    );
    expect(dropped.length).toBe(3);
    expect(entry.total).toBe(342);
  });

  it("builds an exploding + keep entry", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d6", value: 6 },
        { type: "d6", value: 2, dropped: true },
        { type: "d6", value: 6 },
        { type: "d6", value: 3, isExplosion: true },
        { type: "d6", value: 4, isExplosion: true },
      ],
      total: 19,
      notation: "3d6!k2",
    });
    expect(entry.dice[1]).toEqual({ type: "d6", value: 2, dropped: true });
    expect(entry.dice[3]).toEqual({ type: "d6", value: 3, isExplosion: true });
    expect(entry.dice[4]).toEqual({ type: "d6", value: 4, isExplosion: true });
    expect(entry.total).toBe(19);
  });

  it("includes preset name when provided", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d8", value: 5 },
        { type: "mod", value: 3 },
      ],
      total: 8,
      notation: "1d8+3",
      preset: "Fireball",
    });
    expect(entry.preset).toBe("Fireball");
  });

  it("produces valid ISO 8601 UTC timestamp", () => {
    const entry = buildRollEntry({
      diceResults: [{ type: "d20", value: 10 }],
      total: 10,
      notation: "1d20",
    });
    const date = new Date(entry.timestamp);
    expect(date.toISOString()).toBe(entry.timestamp);
  });

  it("preserves notation from original input", () => {
    const entry = buildRollEntry({
      diceResults: [{ type: "d6", value: 3 }],
      total: 3,
      notation: "1d6",
    });
    expect(entry.notation).toBe("1d6");
  });
});
