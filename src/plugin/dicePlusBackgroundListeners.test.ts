import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  obrCalls,
  resetObrCalls,
  simulateBroadcast,
  flushPromises,
} from "../integration/setup";
import { mountDicePlusBackgroundListeners } from "./dicePlusBackgroundListeners";
import {
  DICE_PLUS_IS_READY_CHANNEL,
  DICE_PLUS_ROLL_REQUEST_CHANNEL,
  RollRequest,
} from "./dicePlusProtocol";

describe("Dice+ background listeners", () => {
  let unsubscribe: () => void;

  beforeEach(() => {
    resetObrCalls();
    unsubscribe = mountDicePlusBackgroundListeners();
  });

  afterEach(() => {
    unsubscribe();
  });

  it("answers dice-plus/isReady on the same channel with ready: true", async () => {
    simulateBroadcast(DICE_PLUS_IS_READY_CHANNEL, {
      requestId: "rq-1",
      timestamp: 1000,
    });
    await flushPromises();

    const reply = obrCalls.broadcast.find(
      (b) =>
        b.channel === DICE_PLUS_IS_READY_CHANNEL &&
        (b.data as any).ready === true
    );
    expect(reply).toBeDefined();
    expect((reply!.data as any).requestId).toBe("rq-1");
    expect(typeof (reply!.data as any).timestamp).toBe("number");
  });

  it("emits {source}/roll-error and does not open the action when notation is invalid", async () => {
    const payload: RollRequest = {
      rollId: "roll-bad",
      playerId: "player-1",
      playerName: "Alice",
      rollTarget: "everyone",
      diceNotation: "ddd",
      showResults: true,
      timestamp: 0,
      source: "com.example.forge",
    };
    simulateBroadcast(DICE_PLUS_ROLL_REQUEST_CHANNEL, payload);
    await flushPromises();

    const err = obrCalls.broadcast.find(
      (b) => b.channel === "com.example.forge/roll-error"
    );
    expect(err).toBeDefined();
    expect((err!.data as any).rollId).toBe("roll-bad");
    expect((err!.data as any).notation).toBe("ddd");
    expect(typeof (err!.data as any).error).toBe("string");
    expect(obrCalls.actionOpenCount).toBe(0);
  });

  it("on valid notation, opens the action and pings", async () => {
    const payload: RollRequest = {
      rollId: "roll-good",
      playerId: "player-1",
      playerName: "Alice",
      rollTarget: "everyone",
      diceNotation: "1d20",
      showResults: true,
      timestamp: 0,
      source: "com.example.forge",
    };
    simulateBroadcast(DICE_PLUS_ROLL_REQUEST_CHANNEL, payload);
    // Allow the async relay to begin (open + ping).
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(obrCalls.actionOpenCount).toBe(1);
    const ping = obrCalls.broadcast.find(
      (b) => b.channel === "rodeo.owlbear.dice/internal-ping"
    );
    expect(ping).toBeDefined();
  });

  it("ignores roll requests addressed to a different player", async () => {
    const payload: RollRequest = {
      rollId: "roll-other",
      playerId: "someone-else",
      playerName: "Bob",
      rollTarget: "everyone",
      diceNotation: "1d20",
      showResults: true,
      timestamp: 0,
      source: "com.example.forge",
    };
    simulateBroadcast(DICE_PLUS_ROLL_REQUEST_CHANNEL, payload);
    await flushPromises();

    expect(obrCalls.actionOpenCount).toBe(0);
    expect(
      obrCalls.broadcast.some(
        (b) => b.channel === "com.example.forge/roll-error"
      )
    ).toBe(false);
    expect(
      obrCalls.broadcast.some(
        (b) => b.channel === "rodeo.owlbear.dice/internal-ping"
      )
    ).toBe(false);
  });

  it("writes a debug entry capturing payload, gate decision, and local player id for every roll-request received", async () => {
    const DEBUG_KEY = "com.dicex/debug/last-roll-requests";

    // 1) invalid shape
    simulateBroadcast(DICE_PLUS_ROLL_REQUEST_CHANNEL, { junk: true }, "remote-1");
    await flushPromises();

    // 2) valid but addressed to another player
    simulateBroadcast(
      DICE_PLUS_ROLL_REQUEST_CHANNEL,
      {
        rollId: "r-other",
        playerId: "someone-else",
        playerName: "Bob",
        rollTarget: "everyone",
        diceNotation: "1d20",
        showResults: true,
        timestamp: 0,
        source: "com.example.forge",
      },
      "remote-2"
    );
    await flushPromises();

    // 3) valid and addressed to me
    simulateBroadcast(
      DICE_PLUS_ROLL_REQUEST_CHANNEL,
      {
        rollId: "r-mine",
        playerId: "player-1",
        playerName: "Gandalf",
        rollTarget: "everyone",
        diceNotation: "1d20",
        showResults: true,
        timestamp: 0,
        source: "com.example.forge",
      },
      "remote-3"
    );
    await flushPromises();

    const lastWrite = obrCalls.playerSetMetadata
      .slice()
      .reverse()
      .find((m) => DEBUG_KEY in m);
    expect(lastWrite).toBeDefined();

    const log = (lastWrite as any)[DEBUG_KEY] as Array<Record<string, unknown>>;
    expect(log.length).toBe(3);

    // Newest first
    expect(log[0].result).toBe("relayed");
    expect((log[0].data as any).rollId).toBe("r-mine");
    expect(log[0].localPlayerId).toBe("player-1");
    expect(log[0].connectionId).toBe("remote-3");

    expect(log[1].result).toBe("ignored: not addressed");
    expect((log[1].data as any).rollId).toBe("r-other");

    expect(log[2].result).toBe("ignored: invalid shape");
    expect(log[2].data).toEqual({ junk: true });
  });
});
