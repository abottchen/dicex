import { describe, it, expect, beforeEach } from "vitest";
import { useDiceControlsStore } from "./store";

describe("hiddenDefault", () => {
  beforeEach(() => {
    useDiceControlsStore.setState({ diceHidden: false });
  });

  it("initializes hidden to true for GM role", () => {
    useDiceControlsStore.getState().initializeHidden("GM");
    expect(useDiceControlsStore.getState().diceHidden).toBe(true);
  });

  it("initializes hidden to false for PLAYER role", () => {
    useDiceControlsStore.getState().initializeHidden("PLAYER");
    expect(useDiceControlsStore.getState().diceHidden).toBe(false);
  });

  it("GM can toggle hidden to false", () => {
    useDiceControlsStore.getState().initializeHidden("GM");
    expect(useDiceControlsStore.getState().diceHidden).toBe(true);
    useDiceControlsStore.getState().toggleDiceHidden();
    expect(useDiceControlsStore.getState().diceHidden).toBe(false);
  });

  it("PLAYER can toggle hidden to true", () => {
    useDiceControlsStore.getState().initializeHidden("PLAYER");
    expect(useDiceControlsStore.getState().diceHidden).toBe(false);
    useDiceControlsStore.getState().toggleDiceHidden();
    expect(useDiceControlsStore.getState().diceHidden).toBe(true);
  });
});
