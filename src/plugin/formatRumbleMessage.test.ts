import { describe, it, expect } from "vitest";
import { formatRumbleMessage } from "./formatRumbleMessage";
import { DieResult, ModifierResult } from "../types/RollResult";

describe("formatRumbleMessage", () => {
  it("formats a basic roll", () => {
    const dice: DieResult[] = [
      { type: "d6", value: 3 },
      { type: "d6", value: 3 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 6,
    });
    expect(result).toBe("Gandalf rolled (2d6 \u2192 [3], [3]) for **6**!");
  });

  it("formats a roll with bonus", () => {
    const dice: (DieResult | ModifierResult)[] = [
      { type: "d20", value: 12 },
      { type: "mod", value: 13 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 25,
    });
    expect(result).toBe("Gandalf rolled (1d20 \u2192 [12] +13) for **25**!");
  });

  it("formats mixed dice types", () => {
    const dice: DieResult[] = [
      { type: "d6", value: 3 },
      { type: "d6", value: 3 },
      { type: "d20", value: 4 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 10,
    });
    expect(result).toBe(
      "Gandalf rolled (2d6 \u2192 [3], [3], 1d20 \u2192 [4]) for **10**!"
    );
  });

  it("formats advantage roll", () => {
    const dice: DieResult[] = [
      { type: "d20", value: 15 },
      { type: "d20", value: 4 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 15,
      advantage: "adv",
    });
    expect(result).toBe("Gandalf rolled (2d20 \u2192 [15], [4] adv) for **15**!");
  });

  it("formats disadvantage roll", () => {
    const dice: DieResult[] = [
      { type: "d20", value: 15 },
      { type: "d20", value: 4 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 4,
      advantage: "dis",
    });
    expect(result).toBe("Gandalf rolled (2d20 \u2192 [15], [4] dis) for **4**!");
  });

  it("formats a preset roll", () => {
    const dice: DieResult[] = [
      { type: "d8", value: 8 },
      { type: "d8", value: 3 },
      { type: "d8", value: 6 },
      { type: "d8", value: 3 },
      { type: "d8", value: 2 },
      { type: "d8", value: 5 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 27,
      presetName: "Fireball",
    });
    expect(result).toBe(
      "Gandalf used [Fireball] and rolled (6d8 \u2192 [8], [3], [6], [3], [2], [5]) for **27**!"
    );
  });

  it("formats a preset roll with bonus", () => {
    const dice: (DieResult | ModifierResult)[] = [
      { type: "d20", value: 12 },
      { type: "mod", value: 7 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 19,
      presetName: "Attack",
    });
    expect(result).toBe(
      "Gandalf used [Attack] and rolled (1d20 \u2192 [12] +7) for **19**!"
    );
  });

  it("formats exploding dice with emoji prefix", () => {
    const dice: DieResult[] = [
      { type: "d6", value: 6, exploded: [4] },
      { type: "d6", value: 3 },
      { type: "d6", value: 6, exploded: [2] },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 21,
      notation: "3d6!",
    });
    expect(result).toBe(
      "Gandalf rolled (3d6! \u2192 [\uD83D\uDCA56], [4], [3], [\uD83D\uDCA56], [2]) for **21**!"
    );
  });

  it("formats keep/drop with emoji on dropped dice", () => {
    const dice: DieResult[] = [
      { type: "d6", value: 5 },
      { type: "d6", value: 2, dropped: true },
      { type: "d6", value: 4 },
      { type: "d6", value: 6 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 15,
      notation: "4d6k3",
    });
    expect(result).toBe(
      "Gandalf rolled (4d6k3 \u2192 [5], [\uD83D\uDEAB2], [4], [6]) for **15**!"
    );
  });

  it("shows star emoji for nat 20 on d20", () => {
    const dice: DieResult[] = [{ type: "d20", value: 20 }];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 20,
    });
    expect(result).toBe("Gandalf rolled (1d20 \u2192 [\u2B5020]) for **20**!");
  });

  it("shows skull emoji for nat 1 on d20", () => {
    const dice: DieResult[] = [{ type: "d20", value: 1 }];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 1,
    });
    expect(result).toBe("Gandalf rolled (1d20 \u2192 [\uD83D\uDC801]) for **1**!");
  });

  it("does not show crit emojis on non-d20 dice", () => {
    const dice: DieResult[] = [{ type: "d6", value: 1 }];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 1,
    });
    expect(result).toBe("Gandalf rolled (1d6 \u2192 [1]) for **1**!");
  });

  it("shows lock emoji for hidden rolls", () => {
    const dice: DieResult[] = [{ type: "d20", value: 15 }];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 15,
      hidden: true,
    });
    expect(result).toBe("\uD83D\uDD12 Gandalf rolled (1d20 \u2192 [15]) for **15**!");
  });

  it("no lock emoji for non-hidden rolls", () => {
    const dice: DieResult[] = [{ type: "d20", value: 15 }];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 15,
      hidden: false,
    });
    expect(result).toBe("Gandalf rolled (1d20 \u2192 [15]) for **15**!");
  });
});
