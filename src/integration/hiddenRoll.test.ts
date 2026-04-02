import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  obrCalls, obrConfig, resetStores, resetObrCalls, simulateRoll, flushPromises,
} from "./setup";
import { useDiceControlsStore } from "../controls/store";
import { createRumbleSyncSubscription } from "../plugin/rumbleSyncSubscription";

const RUMBLE_CHAT_KEY = "com.battle-system.friends/metadata_chatlog";

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

  it("player hidden roll sends to player and GM", async () => {
    obrConfig.playerRole = "PLAYER";
    obrConfig.playerId = "player-1";
    useDiceControlsStore.setState({ activeNotation: "1d20" });
    simulateRoll({ dice: [{ type: "D20", value: 10 }], hidden: true });
    await flushPromises();

    expect(obrCalls.playerSetMetadata.length).toBe(2);
    const targets = obrCalls.playerSetMetadata.map(
      (c: any) => c[RUMBLE_CHAT_KEY].targetId
    );
    expect(targets).toContain("player-1");
    expect(targets).toContain("gm-1");
  });

  it("GM hidden roll sends only one message to self", async () => {
    obrConfig.playerRole = "GM";
    obrConfig.playerId = "gm-1";
    useDiceControlsStore.setState({ activeNotation: "1d20" });
    simulateRoll({ dice: [{ type: "D20", value: 10 }], hidden: true });
    await flushPromises();

    expect(obrCalls.playerSetMetadata.length).toBe(1);
    const target = (obrCalls.playerSetMetadata[0] as any)[RUMBLE_CHAT_KEY].targetId;
    expect(target).toBe("gm-1");
  });

  it("non-hidden roll sends to party", async () => {
    useDiceControlsStore.setState({ activeNotation: "1d20" });
    simulateRoll({ dice: [{ type: "D20", value: 10 }], hidden: false });
    await flushPromises();

    expect(obrCalls.playerSetMetadata.length).toBe(1);
    const target = (obrCalls.playerSetMetadata[0] as any)[RUMBLE_CHAT_KEY].targetId;
    expect(target).toBe("0000");
  });
});
