import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  obrCalls, obrConfig, resetStores, resetObrCalls, simulateRoll, flushPromises,
} from "../integration/setup";
import { useDiceControlsStore } from "../controls/store";
import { createRumbleSyncSubscription } from "./rumbleSyncSubscription";

const RUMBLE_CHAT_KEY = "com.battle-system.friends/metadata_chatlog";

describe("RumbleSync subscription", () => {
  let unsubscribe: () => void;

  beforeEach(() => {
    resetStores();
    resetObrCalls();
    unsubscribe = createRumbleSyncSubscription();
  });

  afterEach(() => {
    unsubscribe();
  });

  it("posts basic roll to party chat", async () => {
    useDiceControlsStore.setState({ activeNotation: "2d6" });
    simulateRoll({ dice: [{ type: "D6", value: 3 }, { type: "D6", value: 4 }] });
    await flushPromises();

    expect(obrCalls.playerSetMetadata.length).toBe(1);
    const call = obrCalls.playerSetMetadata[0] as any;
    const chat = call[RUMBLE_CHAT_KEY];
    expect(chat.sender).toBe("Dicex");
    expect(chat.targetId).toBe("0000");
    expect(chat.chatlog).toContain("for **7**!");
  });

  it("includes bonus in message", async () => {
    useDiceControlsStore.setState({ activeNotation: "1d20+5" });
    simulateRoll({ dice: [{ type: "D20", value: 12 }], bonus: 5 });
    await flushPromises();

    const chat = (obrCalls.playerSetMetadata[0] as any)[RUMBLE_CHAT_KEY];
    expect(chat.chatlog).toContain("+5");
    expect(chat.chatlog).toContain("for **17**!");
  });

  it("includes preset name in message", async () => {
    useDiceControlsStore.setState({
      activeNotation: "6d8",
      activePresetName: "Fireball",
    });
    simulateRoll({
      dice: [
        { type: "D8", value: 3 }, { type: "D8", value: 4 },
        { type: "D8", value: 5 }, { type: "D8", value: 2 },
        { type: "D8", value: 6 }, { type: "D8", value: 1 },
      ],
    });
    await flushPromises();

    const chat = (obrCalls.playerSetMetadata[0] as any)[RUMBLE_CHAT_KEY];
    expect(chat.chatlog).toContain("used [Fireball] and rolled");
  });

  it("shows adv suffix for advantage roll", async () => {
    useDiceControlsStore.setState({ activeNotation: "2d20" });
    simulateRoll({
      dice: [{ type: "D20", value: 15 }, { type: "D20", value: 4 }],
      advantage: "ADVANTAGE",
    });
    await flushPromises();

    const chat = (obrCalls.playerSetMetadata[0] as any)[RUMBLE_CHAT_KEY];
    expect(chat.chatlog).toContain("adv");
  });

  it("shows star emoji for nat 20", async () => {
    useDiceControlsStore.setState({ activeNotation: "1d20" });
    simulateRoll({ dice: [{ type: "D20", value: 20 }] });
    await flushPromises();

    const chat = (obrCalls.playerSetMetadata[0] as any)[RUMBLE_CHAT_KEY];
    expect(chat.chatlog).toContain("\u2B50");
  });

  it("shows skull emoji for nat 1", async () => {
    useDiceControlsStore.setState({ activeNotation: "1d20" });
    simulateRoll({ dice: [{ type: "D20", value: 1 }] });
    await flushPromises();

    const chat = (obrCalls.playerSetMetadata[0] as any)[RUMBLE_CHAT_KEY];
    expect(chat.chatlog).toContain("\uD83D\uDC80");
  });

  it("formats multiple dice groups correctly", async () => {
    useDiceControlsStore.setState({ activeNotation: "2d6+1d8" });
    simulateRoll({
      dice: [
        { type: "D6", value: 3 }, { type: "D6", value: 4 },
        { type: "D8", value: 5 },
      ],
    });
    await flushPromises();

    const chat = (obrCalls.playerSetMetadata[0] as any)[RUMBLE_CHAT_KEY];
    expect(chat.chatlog).toContain("2d6");
    expect(chat.chatlog).toContain("1d8");
    expect(chat.chatlog).toContain("for **12**!");
  });

  it("shows lock emoji for hidden rolls", async () => {
    useDiceControlsStore.setState({ activeNotation: "1d20" });
    simulateRoll({ dice: [{ type: "D20", value: 10 }], hidden: true });
    await flushPromises();

    const chat = (obrCalls.playerSetMetadata[0] as any)[RUMBLE_CHAT_KEY];
    expect(chat.chatlog).toContain("\uD83D\uDD12");
  });
});
