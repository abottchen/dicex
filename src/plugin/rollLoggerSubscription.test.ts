import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  obrCalls, obrConfig, resetStores, resetObrCalls, simulateRoll, flushPromises,
} from "../integration/setup";
import { useDiceControlsStore } from "../controls/store";
import { createRollLoggerSubscription } from "./rollLoggerSubscription";

describe("RollLogger subscription", () => {
  let unsubscribe: () => void;

  beforeEach(() => {
    resetStores();
    resetObrCalls();
    unsubscribe = createRollLoggerSubscription();
  });

  afterEach(() => {
    unsubscribe();
  });

  it("creates a log entry on roll completion", async () => {
    useDiceControlsStore.setState({ activeNotation: "1d20" });
    simulateRoll({ dice: [{ type: "D20", value: 15 }] });
    await flushPromises();

    const sceneData = obrCalls.sceneSetMetadata.find(
      (call: any) => call["com.dicex/roll-log/player-1"] !== undefined
    ) as any;
    const logKey = "com.dicex/roll-log/player-1";
    expect(sceneData).toBeDefined();
    expect(sceneData[logKey].name).toBe("Gandalf");
    expect(sceneData[logKey].rolls).toHaveLength(1);
    const entry = sceneData[logKey].rolls[0];
    expect(entry.total).toBe(15);
    expect(entry.notation).toBe("1d20");
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Room metadata should have the manifest
    expect(obrCalls.roomSetMetadata.length).toBeGreaterThanOrEqual(1);
    const manifestCall = obrCalls.roomSetMetadata.find(
      (call: any) => call["com.dicex/roll-log-manifest"] !== undefined
    ) as any;
    expect(manifestCall).toBeDefined();
  });

  it("appends to existing log entries", async () => {
    const logKey = "com.dicex/roll-log/player-1";
    obrConfig.sceneMetadata[logKey] = {
      name: "Gandalf",
      rolls: [{ timestamp: "2026-01-01T00:00:00.000Z", notation: "1d6", dice: [{ type: "d6", value: 3 }], total: 3 }],
    };

    useDiceControlsStore.setState({ activeNotation: "1d20" });
    simulateRoll({ dice: [{ type: "D20", value: 18 }] });
    await flushPromises();

    const sceneData = obrCalls.sceneSetMetadata.find(
      (call: any) => call[logKey] !== undefined
    ) as any;
    expect(sceneData[logKey].rolls).toHaveLength(2);
    expect(sceneData[logKey].rolls[1].total).toBe(18);
  });

  it("includes preset name when set", async () => {
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

    const logKey = "com.dicex/roll-log/player-1";
    const sceneData = obrCalls.sceneSetMetadata.find(
      (call: any) => call[logKey] !== undefined
    ) as any;
    const entry = sceneData[logKey].rolls[0];
    expect(entry.preset).toBe("Fireball");
  });

  it("includes advantage field for advantage rolls", async () => {
    useDiceControlsStore.setState({ activeNotation: "2d20" });
    simulateRoll({
      dice: [{ type: "D20", value: 15 }, { type: "D20", value: 4 }],
      advantage: "ADVANTAGE",
    });
    await flushPromises();

    const logKey = "com.dicex/roll-log/player-1";
    const sceneData = obrCalls.sceneSetMetadata.find(
      (call: any) => call[logKey] !== undefined
    ) as any;
    const entry = sceneData[logKey].rolls[0];
    expect(entry.advantage).toBe("adv");
  });

  it("includes bonus as mod entry in dice array", async () => {
    useDiceControlsStore.setState({ activeNotation: "1d20+5" });
    simulateRoll({ dice: [{ type: "D20", value: 12 }], bonus: 5 });
    await flushPromises();

    const logKey = "com.dicex/roll-log/player-1";
    const sceneData = obrCalls.sceneSetMetadata.find(
      (call: any) => call[logKey] !== undefined
    ) as any;
    const entry = sceneData[logKey].rolls[0];
    const mod = entry.dice.find((d: any) => d.type === "mod");
    expect(mod).toBeDefined();
    expect(mod.value).toBe(5);
    expect(entry.total).toBe(17);
  });
});
