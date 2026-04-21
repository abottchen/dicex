import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  obrCalls,
  resetObrCalls,
  resetStores,
  flushPromises,
} from "./setup";
import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { createRumbleSyncSubscription } from "../plugin/rumbleSyncSubscription";
import { rollFromNotation } from "../helpers/rollFromNotation";

function finishAllDice(value: number) {
  const state = useDiceRollStore.getState();
  const dummy = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
  };
  for (const id of Object.keys(state.rollValues)) {
    useDiceRollStore.getState().finishDieRoll(id, value, dummy);
  }
}

describe("rollFromNotation integration", () => {
  let unsubscribe: () => void;

  beforeEach(() => {
    resetStores();
    resetObrCalls();
    unsubscribe = createRumbleSyncSubscription();
  });

  afterEach(() => {
    unsubscribe();
  });

  it("starts a roll with dice resolved from valid notation", () => {
    const started = rollFromNotation("2d6+3");
    expect(started).toBe(true);

    const roll = useDiceRollStore.getState().roll;
    expect(roll).not.toBeNull();
    expect(roll!.bonus).toBe(3);
    expect(roll!.hidden).toBe(false);
    expect(Object.keys(useDiceRollStore.getState().rollValues)).toHaveLength(2);
  });

  it("returns false and does not roll for invalid notation", () => {
    const started = rollFromNotation("1d3");
    expect(started).toBe(false);
    expect(useDiceRollStore.getState().roll).toBeNull();
  });

  it("inherits diceHidden from the controls store", () => {
    useDiceControlsStore.setState({ diceHidden: true });
    rollFromNotation("1d20");
    expect(useDiceRollStore.getState().roll!.hidden).toBe(true);
  });

  it("clears picked dice, bonus, and advantage before rolling", () => {
    const store = useDiceControlsStore.getState();
    const d20Id = store.diceSet.dice.find((d) => d.type === "D20")!.id;
    useDiceControlsStore.setState({
      diceCounts: { ...store.defaultDiceCounts, [d20Id]: 4 },
      diceBonus: 10,
      diceAdvantage: "ADVANTAGE",
    });

    rollFromNotation("1d6");

    const after = useDiceControlsStore.getState();
    for (const die of after.diceSet.dice) {
      expect(after.diceCounts[die.id]).toBe(0);
    }
    expect(after.diceAdvantage).toBeNull();
  });

  it("fires Rumble broadcast downstream after the roll finishes", async () => {
    rollFromNotation("1d20+2");
    finishAllDice(15);
    await flushPromises();

    expect(obrCalls.broadcast.length).toBe(1);
    const payload = (obrCalls.broadcast[0].data as any).data;
    expect(payload.chatlog).toContain("for **17**!");
    expect(payload.targetId).toBe("0000");
  });

  it("starts a roll with a negative modifier from `1d20-2`", () => {
    const started = rollFromNotation("1d20-2");
    expect(started).toBe(true);

    const roll = useDiceRollStore.getState().roll;
    expect(roll).not.toBeNull();
    expect(roll!.bonus).toBe(-2);
  });

  it("broadcasts a chatlog reflecting a negative modifier total", async () => {
    rollFromNotation("1d20-3");
    finishAllDice(15);
    await flushPromises();

    expect(obrCalls.broadcast.length).toBe(1);
    const payload = (obrCalls.broadcast[0].data as any).data;
    expect(payload.chatlog).toContain("-3");
    expect(payload.chatlog).toContain("for **12**!");
  });
});
