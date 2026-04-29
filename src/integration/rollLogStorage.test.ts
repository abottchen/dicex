import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  obrConfig, resetStores, resetObrCalls, simulateRoll, flushPromises,
} from "./setup";
import { useDiceControlsStore } from "../controls/store";
import { createRollLoggerSubscription } from "../plugin/rollLoggerSubscription";
import { getPlayerLogs, getManifest, clearPlayerLogs } from "../plugin/rollLogStorage";
import { combinePlayerLogs } from "../plugin/rollLogExport";

describe("roll log storage integration", () => {
  let unsubscribe: () => void;

  beforeEach(() => {
    resetStores();
    resetObrCalls();
    obrConfig.sceneItems = [
      { id: "map-1", name: "Dragon's Lair", layer: "MAP", type: "IMAGE" },
    ];
    unsubscribe = createRollLoggerSubscription();
  });

  afterEach(() => {
    unsubscribe();
  });

  it("full write-read-export-clear cycle", async () => {
    // Player 1 rolls
    useDiceControlsStore.setState({ activeNotation: "1d20" });
    simulateRoll({ dice: [{ type: "D20", value: 15 }] });
    await flushPromises();

    // Player 2 rolls
    obrConfig.playerId = "player-2";
    obrConfig.playerName = "Frodo";
    useDiceControlsStore.setState({ activeNotation: "2d6" });
    simulateRoll({ dice: [{ type: "D6", value: 3 }, { type: "D6", value: 4 }] });
    await flushPromises();

    // Read logs
    const logs = await getPlayerLogs();
    expect(Object.keys(logs)).toHaveLength(2);
    expect(logs["player-1"].name).toBe("Gandalf");
    expect(logs["player-1"].rolls).toHaveLength(1);
    expect(logs["player-2"].name).toBe("Frodo");
    expect(logs["player-2"].rolls).toHaveLength(1);

    // Check manifest
    const manifest = await getManifest();
    const sceneIds = Object.keys(manifest);
    expect(sceneIds).toHaveLength(1);
    const entry = manifest[sceneIds[0]];
    expect(entry.sceneName).toBe("Dragon's Lair");
    expect(entry.rollCount).toBe(2);
    expect(entry.playerCount).toBe(2);
    expect(entry.sizeBytes).toBeGreaterThan(0);

    // Export combines correctly
    const combined = combinePlayerLogs(logs);
    expect(combined.players["player-1"].rolls[0].total).toBe(15);
    expect(combined.players["player-2"].rolls[0].total).toBe(7);
    expect(combined.exportedAt).toBeDefined();

    // Clear
    await clearPlayerLogs();

    // Logs should be empty
    const logsAfter = await getPlayerLogs();
    expect(Object.keys(logsAfter)).toHaveLength(0);

    // Manifest should have no entry for this scene
    const manifestAfter = await getManifest();
    expect(Object.keys(manifestAfter)).toHaveLength(0);
  });

  it("multiple rolls from same player accumulate", async () => {
    useDiceControlsStore.setState({ activeNotation: "1d20" });

    simulateRoll({ dice: [{ type: "D20", value: 10 }] });
    await flushPromises();

    simulateRoll({ dice: [{ type: "D20", value: 18 }] });
    await flushPromises();

    simulateRoll({ dice: [{ type: "D20", value: 3 }] });
    await flushPromises();

    const logs = await getPlayerLogs();
    expect(logs["player-1"].rolls).toHaveLength(3);
    expect(logs["player-1"].rolls.map((r: any) => r.total)).toEqual([10, 18, 3]);

    const manifest = await getManifest();
    const sceneId = Object.keys(manifest)[0];
    expect(manifest[sceneId].rollCount).toBe(3);
    expect(manifest[sceneId].playerCount).toBe(1);
  });
});
