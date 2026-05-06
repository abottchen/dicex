import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  obrCalls,
  resetStores,
  resetObrCalls,
  simulateBroadcast,
  flushPromises,
} from "./setup";
import { mountDicePlusBackgroundListeners } from "../plugin/dicePlusBackgroundListeners";
import {
  DICE_PLUS_ROLL_REQUEST_CHANNEL,
  RollRequest,
} from "../plugin/dicePlusProtocol";

describe("Dice+ invalid notation", () => {
  let unsub: () => void;

  beforeEach(() => {
    resetStores();
    resetObrCalls();
    unsub = mountDicePlusBackgroundListeners();
  });

  afterEach(() => unsub());

  it("emits {source}/roll-error and does not open the action", async () => {
    const payload: RollRequest = {
      rollId: "r-bad",
      playerId: "player-1",
      playerName: "Alice",
      rollTarget: "everyone",
      diceNotation: "garbage",
      showResults: true,
      timestamp: 0,
      source: "com.example.forge",
    };

    simulateBroadcast(DICE_PLUS_ROLL_REQUEST_CHANNEL, payload);
    await flushPromises();

    expect(obrCalls.actionOpenCount).toBe(0);
    const err = obrCalls.broadcast.find(
      (b) => b.channel === "com.example.forge/roll-error"
    );
    expect(err).toBeDefined();
    expect((err!.data as any).rollId).toBe("r-bad");
    expect((err!.data as any).notation).toBe("garbage");
  });
});
