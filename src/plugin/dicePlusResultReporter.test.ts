import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  obrCalls,
  resetStores,
  resetObrCalls,
  simulateRoll,
  flushPromises,
} from "../integration/setup";
import { useDiceControlsStore } from "../controls/store";
import { createDicePlusResultReporter } from "./dicePlusResultReporter";
import {
  setPendingRollRequest,
  getPendingRollRequest,
  clearPendingRollRequest,
} from "./dicePlusPendingRequest";
import { parseNotation } from "../helpers/notationParser";

describe("Dice+ result reporter subscription", () => {
  let unsubscribe: () => void;

  beforeEach(() => {
    resetStores();
    resetObrCalls();
    clearPendingRollRequest();
    unsubscribe = createDicePlusResultReporter();
  });

  afterEach(() => {
    unsubscribe();
    clearPendingRollRequest();
  });

  it("does nothing when there is no pending external request", async () => {
    useDiceControlsStore.setState({
      activeNotation: "1d20",
      activeNotationComponents: parseNotation("1d20"),
    });
    simulateRoll({ dice: [{ type: "D20", value: 10 }] });
    await flushPromises();

    const dicePlusBroadcasts = obrCalls.broadcast.filter((b) =>
      b.channel.endsWith("/roll-result")
    );
    expect(dicePlusBroadcasts).toHaveLength(0);
  });

  it("emits {source}/roll-result with the Dice+ payload on completion", async () => {
    setPendingRollRequest({
      rollId: "roll-123",
      source: "com.example.forge",
      playerId: "p-1",
      playerName: "Alice",
      rollTarget: "everyone",
    });
    useDiceControlsStore.setState({
      activeNotation: "1d20+3",
      activeNotationComponents: parseNotation("1d20+3"),
    });
    simulateRoll({ dice: [{ type: "D20", value: 12 }], bonus: 3 });
    await flushPromises();

    const sent = obrCalls.broadcast.find(
      (b) => b.channel === "com.example.forge/roll-result"
    );
    expect(sent).toBeDefined();
    const payload = sent!.data as any;
    expect(payload.rollId).toBe("roll-123");
    expect(payload.playerId).toBe("p-1");
    expect(payload.playerName).toBe("Alice");
    expect(payload.rollTarget).toBe("everyone");
    expect(payload.result.totalValue).toBe(15);
    expect(payload.result.groups).toHaveLength(2);
  });

  it("clears the pending request after emitting", async () => {
    setPendingRollRequest({
      rollId: "roll-456",
      source: "com.example.forge",
      playerId: "p-1",
      playerName: "Alice",
      rollTarget: "self",
    });
    useDiceControlsStore.setState({
      activeNotation: "1d6",
      activeNotationComponents: parseNotation("1d6"),
    });
    simulateRoll({ dice: [{ type: "D6", value: 4 }] });
    await flushPromises();

    expect(getPendingRollRequest()).toBeNull();
  });

  it("does not fire while explosion waves are active", async () => {
    setPendingRollRequest({
      rollId: "roll-789",
      source: "com.example.forge",
      playerId: "p-1",
      playerName: "Alice",
      rollTarget: "everyone",
    });
    useDiceControlsStore.setState({
      activeNotation: "1d6!",
      activeNotationComponents: parseNotation("1d6!"),
    });

    // Drive the roll manually so we can flag explosions active BEFORE the
    // dice finish — startRoll resets explosionWavesActive to false, so we
    // must set it after startRoll but before the last finishDieRoll.
    const { useDiceRollStore } = await import("../dice/store");
    const die = { id: "die-test-1", style: "IRON" as const, type: "D6" as const };
    useDiceRollStore.getState().startRoll({ dice: [die] });
    useDiceRollStore.getState().setExplosionWavesActive(true);

    const ids = Object.keys(useDiceRollStore.getState().rollValues);
    const dummy = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    };
    useDiceRollStore.getState().finishDieRoll(ids[0], 6, dummy);
    await flushPromises();

    const sent = obrCalls.broadcast.find(
      (b) => b.channel === "com.example.forge/roll-result"
    );
    expect(sent).toBeUndefined();
  });
});
