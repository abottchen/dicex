import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  obrCalls,
  obrConfig,
  resetObrCalls,
  simulateBroadcast,
} from "../integration/setup";
import { relayRollRequest } from "./dicePlusBackgroundCoordinator";
import {
  INTERNAL_PING_CHANNEL,
  INTERNAL_READY_CHANNEL,
  INTERNAL_ROLL_CHANNEL,
  RollRequest,
} from "./dicePlusProtocol";

const samplePayload: RollRequest = {
  rollId: "r-1",
  playerId: "p-1",
  playerName: "Alice",
  rollTarget: "everyone",
  diceNotation: "1d20",
  showResults: true,
  timestamp: 0,
  source: "com.example.forge",
};

describe("relayRollRequest", () => {
  beforeEach(() => {
    resetObrCalls();
    obrConfig.actionIsOpen = false;
  });

  it("opens the action, pings, then sends internal-roll once ready arrives", async () => {
    const promise = relayRollRequest(samplePayload);

    // Microtask flush for the ping to be sent.
    await Promise.resolve();
    await Promise.resolve();

    expect(obrCalls.actionOpenCount).toBe(1);

    const ping = obrCalls.broadcast.find((b) => b.channel === INTERNAL_PING_CHANNEL);
    expect(ping).toBeDefined();
    const nonce = (ping!.data as any).nonce;
    expect(typeof nonce).toBe("string");

    // No internal-roll yet — we haven't replied with ready.
    expect(
      obrCalls.broadcast.find((b) => b.channel === INTERNAL_ROLL_CHANNEL)
    ).toBeUndefined();

    // Simulate the action sidebar's reply.
    simulateBroadcast(INTERNAL_READY_CHANNEL, { nonce });

    await promise;

    const roll = obrCalls.broadcast.find((b) => b.channel === INTERNAL_ROLL_CHANNEL);
    expect(roll).toBeDefined();
    expect((roll!.data as any).rollId).toBe("r-1");
  });

  it("relays anyway after the handshake timeout", async () => {
    vi.useFakeTimers();
    try {
      const promise = relayRollRequest(samplePayload);
      // Don't reply with ready. Advance past the 2s timeout.
      await vi.advanceTimersByTimeAsync(2100);
      await promise;

      const roll = obrCalls.broadcast.find(
        (b) => b.channel === INTERNAL_ROLL_CHANNEL
      );
      expect(roll).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
