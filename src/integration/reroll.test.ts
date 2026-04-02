import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  obrCalls, resetStores, resetObrCalls, simulateRoll, flushPromises,
} from "./setup";
import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { createRumbleSyncSubscription } from "../plugin/rumbleSyncSubscription";

const RUMBLE_CHAT_KEY = "com.battle-system.friends/metadata_chatlog";

describe("reroll detection", () => {
  let unsubscribe: () => void;

  beforeEach(() => {
    resetStores();
    resetObrCalls();
    unsubscribe = createRumbleSyncSubscription();
  });

  afterEach(() => {
    unsubscribe();
  });

  it("reroll all fires subscription again", async () => {
    useDiceControlsStore.setState({ activeNotation: "2d6" });
    simulateRoll({ dice: [{ type: "D6", value: 3 }, { type: "D6", value: 4 }] });
    await flushPromises();
    expect(obrCalls.playerSetMetadata.length).toBe(1);

    // Reroll
    useDiceRollStore.getState().reroll();
    // Finish the new dice
    const state = useDiceRollStore.getState();
    const nullIds = Object.entries(state.rollValues)
      .filter(([, v]) => v === null)
      .map(([id]) => id);
    const dummyTransform = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } };
    for (const id of nullIds) {
      useDiceRollStore.getState().finishDieRoll(id, 5, dummyTransform);
    }
    await flushPromises();

    expect(obrCalls.playerSetMetadata.length).toBe(2);
  });

  it("does not double-fire after reroll completes", async () => {
    useDiceControlsStore.setState({ activeNotation: "1d6" });
    simulateRoll({ dice: [{ type: "D6", value: 3 }] });
    await flushPromises();
    expect(obrCalls.playerSetMetadata.length).toBe(1);

    // Reroll and complete
    useDiceRollStore.getState().reroll();
    const state = useDiceRollStore.getState();
    const nullIds = Object.entries(state.rollValues)
      .filter(([, v]) => v === null)
      .map(([id]) => id);
    const dummyTransform = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } };
    for (const id of nullIds) {
      useDiceRollStore.getState().finishDieRoll(id, 4, dummyTransform);
    }
    await flushPromises();
    expect(obrCalls.playerSetMetadata.length).toBe(2);

    // Wait again — should not fire again
    await flushPromises();
    expect(obrCalls.playerSetMetadata.length).toBe(2);
  });
});
