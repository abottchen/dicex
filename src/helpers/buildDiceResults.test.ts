import { describe, it, expect } from "vitest";
import { buildDiceResults } from "./buildDiceResults";
import { DiceRoll } from "../types/DiceRoll";
import { Die } from "../types/Die";
import { Dice } from "../types/Dice";

function makeDie(id: string, type: string = "D6"): Die {
  return { id, style: "GALAXY" as any, type: type as any };
}

describe("buildDiceResults", () => {
  it("returns correct dice results and total for a basic 2d6 roll", () => {
    const die1 = makeDie("die-1");
    const die2 = makeDie("die-2");
    const roll: DiceRoll = { dice: [die1, die2] };
    const rollValues = { "die-1": 3, "die-2": 5 };

    const result = buildDiceResults({ roll, rollValues });

    expect(result.dice).toHaveLength(2);
    expect(result.dice[0]).toEqual({ type: "d6", value: 3 });
    expect(result.dice[1]).toEqual({ type: "d6", value: 5 });
    expect(result.total).toBe(8);
    expect(result.advantage).toBeUndefined();
  });

  it("includes bonus as a modifier result and adds it to total", () => {
    const die1 = makeDie("die-1", "D20");
    const roll: DiceRoll = { dice: [die1], bonus: 5 };
    const rollValues = { "die-1": 15 };

    const result = buildDiceResults({ roll, rollValues });

    expect(result.dice).toHaveLength(2);
    expect(result.dice[1]).toEqual({ type: "mod", value: 5 });
    expect(result.total).toBe(20);
  });

  it("detects advantage from HIGHEST combination in nested dice", () => {
    const die1 = makeDie("die-1", "D20");
    const die2 = makeDie("die-2", "D20");
    const advGroup: Dice = { dice: [die1, die2], combination: "HIGHEST" };
    const roll: DiceRoll = { dice: [advGroup] };
    const rollValues = { "die-1": 8, "die-2": 17 };

    const result = buildDiceResults({ roll, rollValues });

    expect(result.advantage).toBe("adv");
    expect(result.total).toBe(17);
  });

  it("detects disadvantage from LOWEST combination in nested dice", () => {
    const die1 = makeDie("die-1", "D20");
    const die2 = makeDie("die-2", "D20");
    const disGroup: Dice = { dice: [die1, die2], combination: "LOWEST" };
    const roll: DiceRoll = { dice: [disGroup] };
    const rollValues = { "die-1": 8, "die-2": 17 };

    const result = buildDiceResults({ roll, rollValues });

    expect(result.advantage).toBe("dis");
    expect(result.total).toBe(8);
  });

  it("passes through activeNotation and activePresetName", () => {
    const die1 = makeDie("die-1");
    const roll: DiceRoll = { dice: [die1] };
    const rollValues = { "die-1": 4 };

    const result = buildDiceResults({
      roll,
      rollValues,
      activeNotation: "1d6",
      activePresetName: "My Preset",
    });

    expect(result.notation).toBe("1d6");
    expect(result.presetName).toBe("My Preset");
  });

  it("omits notation and presetName when not provided", () => {
    const die1 = makeDie("die-1");
    const roll: DiceRoll = { dice: [die1] };
    const rollValues = { "die-1": 4 };

    const result = buildDiceResults({ roll, rollValues });

    expect(result.notation).toBeUndefined();
    expect(result.presetName).toBeUndefined();
  });

  it("uses basic path (getCombinedDiceValue) when no notation components provided", () => {
    const die1 = makeDie("die-1");
    const die2 = makeDie("die-2");
    const roll: DiceRoll = { dice: [die1, die2], bonus: 2 };
    const rollValues = { "die-1": 3, "die-2": 4 };

    const result = buildDiceResults({
      roll,
      rollValues,
      activeNotationComponents: null,
    });

    expect(result.total).toBe(9);
  });

  it("uses advanced path (calculateTotal) when notation components are present with keep", () => {
    const die1 = makeDie("die-1");
    const die2 = makeDie("die-2");
    const die3 = makeDie("die-3");
    const die4 = makeDie("die-4");
    const roll: DiceRoll = { dice: [die1, die2, die3, die4] };
    const rollValues = { "die-1": 5, "die-2": 2, "die-3": 4, "die-4": 6 };

    const result = buildDiceResults({
      roll,
      rollValues,
      activeNotationComponents: [{ count: 4, sides: 6, keep: 3 }],
    });

    // The lowest die (value=2) should be dropped; total = 5+4+6 = 15
    const dropped = result.dice.filter((d) => "dropped" in d && d.dropped);
    expect(dropped).toHaveLength(1);
    expect((dropped[0] as any).value).toBe(2);
    expect(result.total).toBe(15);
  });

  it("uses advanced path with drop notation component", () => {
    const die1 = makeDie("die-1");
    const die2 = makeDie("die-2");
    const die3 = makeDie("die-3");
    const roll: DiceRoll = { dice: [die1, die2, die3] };
    const rollValues = { "die-1": 1, "die-2": 4, "die-3": 6 };

    const result = buildDiceResults({
      roll,
      rollValues,
      activeNotationComponents: [{ count: 3, sides: 6, drop: 1 }],
    });

    // The lowest die (value=1) should be dropped; total = 4+6 = 10
    const dropped = result.dice.filter((d) => "dropped" in d && d.dropped);
    expect(dropped).toHaveLength(1);
    expect((dropped[0] as any).value).toBe(1);
    expect(result.total).toBe(10);
  });

  it("uses advanced path with exploding notation - no explosions when threshold not met", () => {
    const die1 = makeDie("die-1");
    const die2 = makeDie("die-2");
    const roll: DiceRoll = { dice: [die1, die2] };
    // Values 3 and 4 will never trigger explode on value 99
    const rollValues = { "die-1": 3, "die-2": 4 };

    const result = buildDiceResults({
      roll,
      rollValues,
      activeNotationComponents: [
        { count: 2, sides: 6, explode: { type: "exact", value: 99 } },
      ],
    });

    expect(result.dice).toHaveLength(2);
    expect((result.dice[0] as any).exploded).toBeUndefined();
    expect((result.dice[1] as any).exploded).toBeUndefined();
    expect(result.total).toBe(7);
  });
});
