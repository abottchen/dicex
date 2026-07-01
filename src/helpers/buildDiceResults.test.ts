import { describe, it, expect } from "vitest";
import { buildDiceResults } from "./buildDiceResults";
import { DiceRoll } from "../types/DiceRoll";
import { Die } from "../types/Die";
import { Dice } from "../types/Dice";
import { NotationComponent, parseNotation } from "./notationParser";

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

  it("keeps a d100 percentile pair's d10 ones-digit raw (1d100=70, not 80)", () => {
    // A d100 roll is a nested {D100, D10} pair; the D10 is the ones digit, where
    // a face of 0 means 0 (NOT 10). buildBasicResults must not normalize it.
    const d100 = makeDie("hundreds", "D100");
    const d10 = makeDie("ones", "D10");
    const roll: DiceRoll = { dice: [{ dice: [d100, d10] }] };

    const result = buildDiceResults({ roll, rollValues: { hundreds: 70, ones: 0 } });

    expect(result.total).toBe(70);
    const ones = result.dice.find((d) => d.type === "d10");
    expect(ones).toEqual({ type: "d10", value: 0 });
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
    expect(result.total).toBe(7);
  });

  it("does not silently generate explosion values (physics-driven only)", () => {
    const roll: DiceRoll = {
      dice: [
        { id: "d1", style: "IRON" as any, type: "D6" as any },
        { id: "exp1", style: "IRON" as any, type: "D6" as any, isExplosion: true },
      ],
    };
    const rollValues = { d1: 6, exp1: 4 };
    const components: NotationComponent[] = [
      { count: 1, sides: 6, explode: { type: "max" } },
    ];

    const result = buildDiceResults({
      roll,
      rollValues,
      activeNotationComponents: components,
    });

    // Total should be 6 + 4 = 10 — no silent explosions generated
    expect(result.total).toBe(10);
  });
});

describe("buildDiceResults droppedIds", () => {
  it("reports the id of the die dropped by keep-highest (4d6k3)", () => {
    const dice = [
      makeDie("a"), makeDie("b"), makeDie("c"), makeDie("d"),
    ];
    const roll: DiceRoll = { dice };
    const result = buildDiceResults({
      roll,
      rollValues: { a: 5, b: 2, c: 4, d: 6 }, // lowest is b
      activeNotationComponents: parseNotation("4d6k3"),
    });

    expect(result.total).toBe(15); // 5 + 4 + 6
    expect(result.droppedIds).toEqual(["b"]);
  });

  it("reports the id of the die dropped by disadvantage (2d20kl1)", () => {
    const dice = [makeDie("hi", "D20"), makeDie("lo", "D20")];
    const roll: DiceRoll = { dice };
    const result = buildDiceResults({
      roll,
      rollValues: { hi: 18, lo: 5 },
      activeNotationComponents: parseNotation("2d20kl1"),
    });

    expect(result.total).toBe(5);
    expect(result.droppedIds).toEqual(["hi"]);
  });

  it("returns an empty droppedIds for a plain roll (2d6)", () => {
    const roll: DiceRoll = { dice: [makeDie("a"), makeDie("b")] };
    const result = buildDiceResults({
      roll,
      rollValues: { a: 3, b: 4 },
      activeNotationComponents: parseNotation("2d6"),
    });

    expect(result.total).toBe(7);
    expect(result.droppedIds).toEqual([]);
  });

  it("returns an empty droppedIds for explode without keep (3d6!)", () => {
    const roll: DiceRoll = { dice: [makeDie("a"), makeDie("b"), makeDie("c")] };
    const result = buildDiceResults({
      roll,
      rollValues: { a: 6, b: 3, c: 2 },
      activeNotationComponents: parseNotation("3d6!"),
    });

    expect(result.droppedIds).toEqual([]);
  });

  it("treats a d10 face-0 as 10 when dropping the highest (2d10kl1)", () => {
    const roll: DiceRoll = { dice: [makeDie("zero", "D10"), makeDie("seven", "D10")] };
    const result = buildDiceResults({
      roll,
      rollValues: { zero: 0, seven: 7 }, // a 0-face d10 means 10
      activeNotationComponents: parseNotation("2d10kl1"),
    });

    // Disadvantage keeps the lower face: 7, dropping the 0 (=10)
    expect(result.total).toBe(7);
    expect(result.droppedIds).toEqual(["zero"]);
  });

  it("treats a d10 face-0 as 10 when keeping the highest (2d10kh1)", () => {
    const roll: DiceRoll = { dice: [makeDie("zero", "D10"), makeDie("seven", "D10")] };
    const result = buildDiceResults({
      roll,
      rollValues: { zero: 0, seven: 7 },
      activeNotationComponents: parseNotation("2d10kh1"),
    });

    // Advantage keeps the higher face: the 0 (=10), dropping the 7
    expect(result.total).toBe(10);
    expect(result.droppedIds).toEqual(["seven"]);
  });

  it("never marks physics-driven explosion dice as dropped (3d6!kh2)", () => {
    // 3 base d6 + 1 explosion die; kh2 drops one BASE die, never the explosion
    const roll: DiceRoll = {
      dice: [
        makeDie("base1"), makeDie("base2"), makeDie("base3"),
        { id: "exp1", style: "IRON" as any, type: "D6" as any, isExplosion: true },
      ],
    };
    const result = buildDiceResults({
      roll,
      rollValues: { base1: 6, base2: 1, base3: 4, exp1: 5 },
      activeNotationComponents: parseNotation("3d6!kh2"),
    });

    // Lowest base die (base2 = 1) dropped; explosion never dropped
    expect(result.droppedIds).toEqual(["base2"]);
    expect(result.droppedIds).not.toContain("exp1");
    // Total keeps the two highest base dice (6, 4) plus the explosion (5)
    expect(result.total).toBe(15);
  });
});
