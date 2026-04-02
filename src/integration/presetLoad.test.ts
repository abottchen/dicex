import { describe, it, expect, beforeEach } from "vitest";
import { resetStores } from "./setup";
import { useDiceControlsStore } from "../controls/store";
import { isModifierComponent, DiceComponent } from "../helpers/notationParser";
import { loadPresetIntoControls } from "../helpers/loadPresetIntoControls";

describe("preset load into controls", () => {
  beforeEach(() => {
    resetStores();
  });

  it("loads simple notation 2d6", () => {
    loadPresetIntoControls("2d6", "Test");
    const state = useDiceControlsStore.getState();
    const d6 = state.diceSet.dice.find((d) => d.type === "D6");
    expect(state.diceCounts[d6!.id]).toBe(2);
    expect(state.activePresetName).toBe("Test");
  });

  it("loads notation with bonus 1d20+7", () => {
    loadPresetIntoControls("1d20+7", "Attack");
    const state = useDiceControlsStore.getState();
    const d20 = state.diceSet.dice.find((d) => d.type === "D20");
    expect(state.diceCounts[d20!.id]).toBe(1);
    expect(state.diceBonus).toBe(7);
  });

  it("loads advanced notation 4d6k3 with keep component", () => {
    loadPresetIntoControls("4d6k3", "Stats");
    const state = useDiceControlsStore.getState();
    const d6 = state.diceSet.dice.find((d) => d.type === "D6");
    expect(state.diceCounts[d6!.id]).toBe(4);
    const diceComponents = state.activeNotationComponents!.filter(
      (c): c is DiceComponent => !isModifierComponent(c)
    );
    expect(diceComponents[0].keep).toBe(3);
  });

  it("loads exploding notation 3d6!", () => {
    loadPresetIntoControls("3d6!", "Chaos");
    const state = useDiceControlsStore.getState();
    const diceComponents = state.activeNotationComponents!.filter(
      (c): c is DiceComponent => !isModifierComponent(c)
    );
    expect(diceComponents[0].explode).toEqual({ type: "max" });
  });

  it("clears previous dice counts when loading", () => {
    // Set some initial counts
    const state = useDiceControlsStore.getState();
    const d4 = state.diceSet.dice.find((d) => d.type === "D4");
    state.changeDieCount(d4!.id, 5);
    expect(useDiceControlsStore.getState().diceCounts[d4!.id]).toBe(5);

    // Load a preset that doesn't use d4
    loadPresetIntoControls("2d6", "Test");
    expect(useDiceControlsStore.getState().diceCounts[d4!.id]).toBe(0);
  });
});
