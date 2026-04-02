import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  obrCalls, obrConfig, resetStores, resetObrCalls, simulateRoll, flushPromises,
} from "../integration/setup";
import { useDiceControlsStore } from "../controls/store";
import { createRollLoggerSubscription } from "./rollLoggerSubscription";

const LOG_KEY_PREFIX = "com.dicex/roll-log/";

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

    expect(obrCalls.roomSetMetadata.length).toBe(1);
    const data = obrCalls.roomSetMetadata[0] as any;
    const logKey = `${LOG_KEY_PREFIX}player-1`;
    expect(data[logKey]).toBeDefined();
    expect(data[logKey].name).toBe("Gandalf");
    expect(data[logKey].rolls).toHaveLength(1);
    const entry = data[logKey].rolls[0];
    expect(entry.total).toBe(15);
    expect(entry.notation).toBe("1d20");
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("appends to existing log entries", async () => {
    const logKey = `${LOG_KEY_PREFIX}player-1`;
    obrConfig.roomMetadata[logKey] = {
      name: "Gandalf",
      rolls: [{ timestamp: "2026-01-01T00:00:00.000Z", notation: "1d6", dice: [{ type: "d6", value: 3 }], total: 3 }],
    };

    useDiceControlsStore.setState({ activeNotation: "1d20" });
    simulateRoll({ dice: [{ type: "D20", value: 18 }] });
    await flushPromises();

    const data = obrCalls.roomSetMetadata[0] as any;
    expect(data[logKey].rolls).toHaveLength(2);
    expect(data[logKey].rolls[1].total).toBe(18);
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

    const logKey = `${LOG_KEY_PREFIX}player-1`;
    const entry = (obrCalls.roomSetMetadata[0] as any)[logKey].rolls[0];
    expect(entry.preset).toBe("Fireball");
  });

  it("includes advantage field for advantage rolls", async () => {
    useDiceControlsStore.setState({ activeNotation: "2d20" });
    simulateRoll({
      dice: [{ type: "D20", value: 15 }, { type: "D20", value: 4 }],
      advantage: "ADVANTAGE",
    });
    await flushPromises();

    const logKey = `${LOG_KEY_PREFIX}player-1`;
    const entry = (obrCalls.roomSetMetadata[0] as any)[logKey].rolls[0];
    expect(entry.advantage).toBe("adv");
  });

  it("includes bonus as mod entry in dice array", async () => {
    useDiceControlsStore.setState({ activeNotation: "1d20+5" });
    simulateRoll({ dice: [{ type: "D20", value: 12 }], bonus: 5 });
    await flushPromises();

    const logKey = `${LOG_KEY_PREFIX}player-1`;
    const entry = (obrCalls.roomSetMetadata[0] as any)[logKey].rolls[0];
    const mod = entry.dice.find((d: any) => d.type === "mod");
    expect(mod).toBeDefined();
    expect(mod.value).toBe(5);
    expect(entry.total).toBe(17);
  });
});
