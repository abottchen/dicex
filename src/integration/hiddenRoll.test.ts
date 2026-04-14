import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  obrCalls, obrConfig, resetStores, resetObrCalls, simulateRoll, flushPromises,
} from "./setup";
import { useDiceControlsStore } from "../controls/store";
import { createRumbleSyncSubscription } from "../plugin/rumbleSyncSubscription";

function broadcastTargetIds(): string[] {
  return obrCalls.broadcast.map((c) => (c.data as any).data.targetId);
}

describe("hidden roll targeting", () => {
  let unsubscribe: () => void;

  beforeEach(() => {
    resetStores();
    resetObrCalls();
    unsubscribe = createRumbleSyncSubscription();
  });

  afterEach(() => {
    unsubscribe();
  });

  it("player hidden roll broadcasts to player and GM", async () => {
    obrConfig.playerRole = "PLAYER";
    obrConfig.playerId = "player-1";
    useDiceControlsStore.setState({ activeNotation: "1d20" });
    simulateRoll({ dice: [{ type: "D20", value: 10 }], hidden: true });
    await flushPromises();

    expect(obrCalls.broadcast.length).toBe(2);
    const targets = broadcastTargetIds();
    expect(targets).toContain("player-1");
    expect(targets).toContain("gm-1");
  });

  it("GM hidden roll broadcasts only one message to self", async () => {
    obrConfig.playerRole = "GM";
    obrConfig.playerId = "gm-1";
    useDiceControlsStore.setState({ activeNotation: "1d20" });
    simulateRoll({ dice: [{ type: "D20", value: 10 }], hidden: true });
    await flushPromises();

    expect(obrCalls.broadcast.length).toBe(1);
    expect(broadcastTargetIds()[0]).toBe("gm-1");
  });

  it("non-hidden roll broadcasts to party", async () => {
    useDiceControlsStore.setState({ activeNotation: "1d20" });
    simulateRoll({ dice: [{ type: "D20", value: 10 }], hidden: false });
    await flushPromises();

    expect(obrCalls.broadcast.length).toBe(1);
    expect(broadcastTargetIds()[0]).toBe("0000");
  });
});
