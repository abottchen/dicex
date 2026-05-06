import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  obrCalls,
  resetStores,
  resetObrCalls,
  simulateBroadcast,
  flushPromises,
} from "../integration/setup";
import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { createDicePlusInternalRollHandler } from "./dicePlusInternalRollHandler";
import {
  getPendingRollRequest,
  clearPendingRollRequest,
} from "./dicePlusPendingRequest";
import {
  INTERNAL_PING_CHANNEL,
  INTERNAL_READY_CHANNEL,
  INTERNAL_ROLL_CHANNEL,
} from "./dicePlusProtocol";

describe("dicePlusInternalRollHandler", () => {
  let unsubscribe: () => void;

  beforeEach(() => {
    resetStores();
    resetObrCalls();
    clearPendingRollRequest();
    unsubscribe = createDicePlusInternalRollHandler();
  });

  afterEach(() => {
    unsubscribe();
    clearPendingRollRequest();
  });

  it("responds to internal-ping with internal-ready", () => {
    simulateBroadcast(INTERNAL_PING_CHANNEL, { nonce: "abc" });

    const reply = obrCalls.broadcast.find(
      (b) => b.channel === INTERNAL_READY_CHANNEL
    );
    expect(reply).toBeDefined();
    expect((reply!.data as any).nonce).toBe("abc");
  });

  it("on internal-roll: stores pending request, sets hidden from rollTarget, starts roll", async () => {
    simulateBroadcast(INTERNAL_ROLL_CHANNEL, {
      rollId: "r-1",
      playerId: "p-1",
      playerName: "Alice",
      rollTarget: "self",
      diceNotation: "1d20+3",
      showResults: true,
      timestamp: 0,
      source: "com.example.forge",
    });
    await flushPromises();

    const pending = getPendingRollRequest();
    expect(pending).toEqual({
      rollId: "r-1",
      playerId: "p-1",
      playerName: "Alice",
      rollTarget: "self",
      source: "com.example.forge",
    });

    const controls = useDiceControlsStore.getState();
    expect(controls.diceHidden).toBe(true);
    expect(controls.activeNotation).toBe("1d20+3");

    const rollState = useDiceRollStore.getState();
    expect(rollState.roll).not.toBeNull();
  });

  it("rollTarget=everyone is forced hidden by the Dice+ override", async () => {
    simulateBroadcast(INTERNAL_ROLL_CHANNEL, {
      rollId: "r-2",
      playerId: "p-1",
      playerName: "Alice",
      rollTarget: "everyone",
      diceNotation: "1d6",
      showResults: true,
      timestamp: 0,
      source: "com.example.forge",
    });
    await flushPromises();

    expect(useDiceControlsStore.getState().diceHidden).toBe(true);
  });

  it("rollTarget=dm produces a hidden roll", async () => {
    simulateBroadcast(INTERNAL_ROLL_CHANNEL, {
      rollId: "r-3",
      playerId: "p-1",
      playerName: "Alice",
      rollTarget: "dm",
      diceNotation: "1d6",
      showResults: true,
      timestamp: 0,
      source: "com.example.forge",
    });
    await flushPromises();

    expect(useDiceControlsStore.getState().diceHidden).toBe(true);
  });

  it("rollTarget=gm_only produces a hidden roll", async () => {
    simulateBroadcast(INTERNAL_ROLL_CHANNEL, {
      rollId: "r-4",
      playerId: "p-1",
      playerName: "Alice",
      rollTarget: "gm_only",
      diceNotation: "1d6",
      showResults: true,
      timestamp: 0,
      source: "com.example.forge",
    });
    await flushPromises();

    expect(useDiceControlsStore.getState().diceHidden).toBe(true);
  });
});
