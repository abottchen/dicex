import { describe, it, expect, beforeEach } from "vitest";
import { obrConfig, resetObrCalls } from "../integration/setup";
import { RollEntry } from "../types/RollResult";
import {
  SceneLogManifest,
  getManifest,
  getPlayerLogs,
  appendRollEntry,
  clearPlayerLogs,
} from "./rollLogStorage";

const MANIFEST_KEY = "com.dicex/roll-log-manifest";
const SCENE_ID_KEY = "com.dicex/scene-id";
const LOG_KEY_PREFIX = "com.dicex/roll-log/";

function makeEntry(overrides?: Partial<RollEntry>): RollEntry {
  return {
    timestamp: "2026-04-28T12:00:00.000Z",
    notation: "1d20",
    dice: [{ type: "d20", value: 15 }],
    total: 15,
    ...overrides,
  };
}

describe("rollLogStorage", () => {
  beforeEach(() => {
    resetObrCalls();
  });

  describe("getManifest", () => {
    it("returns empty object when no manifest exists", async () => {
      const manifest = await getManifest();
      expect(manifest).toEqual({});
    });

    it("returns existing manifest from room metadata", async () => {
      const existing: Record<string, SceneLogManifest> = {
        "scene-abc": {
          sceneName: "Dungeon Map",
          playerCount: 2,
          rollCount: 10,
          sizeBytes: 512,
          lastUpdated: "2026-04-28T10:00:00.000Z",
        },
      };
      obrConfig.roomMetadata[MANIFEST_KEY] = existing;

      const manifest = await getManifest();
      expect(manifest).toEqual(existing);
    });
  });

  describe("getPlayerLogs", () => {
    it("returns empty object when no logs exist", async () => {
      const logs = await getPlayerLogs();
      expect(logs).toEqual({});
    });

    it("returns player logs from scene metadata", async () => {
      const entry = makeEntry();
      obrConfig.sceneMetadata[`${LOG_KEY_PREFIX}player-1`] = {
        name: "Gandalf",
        rolls: [entry],
      };

      const logs = await getPlayerLogs();
      expect(logs).toEqual({
        "player-1": { name: "Gandalf", rolls: [entry] },
      });
    });

    it("ignores non-dicex keys in scene metadata", async () => {
      obrConfig.sceneMetadata["some.other/key"] = { data: true };
      obrConfig.sceneMetadata[`${LOG_KEY_PREFIX}player-1`] = {
        name: "Gandalf",
        rolls: [makeEntry()],
      };

      const logs = await getPlayerLogs();
      expect(Object.keys(logs)).toEqual(["player-1"]);
    });
  });

  describe("appendRollEntry", () => {
    it("creates new player log and manifest on first roll", async () => {
      obrConfig.sceneItems = [
        { id: "item-1", name: "Dungeon Map", layer: "MAP", type: "IMAGE" },
      ];

      const entry = makeEntry();
      await appendRollEntry("player-1", "Gandalf", entry);

      // Should have created a scene ID
      expect(obrConfig.sceneMetadata[SCENE_ID_KEY]).toBeDefined();
      const sceneId = obrConfig.sceneMetadata[SCENE_ID_KEY] as string;

      // Should have written the player log to scene metadata
      const playerLog = obrConfig.sceneMetadata[`${LOG_KEY_PREFIX}player-1`] as {
        name: string;
        rolls: RollEntry[];
      };
      expect(playerLog.name).toBe("Gandalf");
      expect(playerLog.rolls).toHaveLength(1);
      expect(playerLog.rolls[0]).toEqual(entry);

      // Should have created manifest entry in room metadata
      const manifest = obrConfig.roomMetadata[MANIFEST_KEY] as Record<
        string,
        SceneLogManifest
      >;
      expect(manifest[sceneId]).toBeDefined();
      expect(manifest[sceneId].sceneName).toBe("Dungeon Map");
      expect(manifest[sceneId].playerCount).toBe(1);
      expect(manifest[sceneId].rollCount).toBe(1);
      expect(manifest[sceneId].lastUpdated).toBe(entry.timestamp);
      expect(manifest[sceneId].sizeBytes).toBeGreaterThan(0);
    });

    it("appends to existing player log", async () => {
      obrConfig.sceneItems = [
        { id: "item-1", name: "Dungeon Map", layer: "MAP", type: "IMAGE" },
      ];

      const entry1 = makeEntry({ timestamp: "2026-04-28T12:00:00.000Z" });
      const entry2 = makeEntry({
        timestamp: "2026-04-28T12:01:00.000Z",
        notation: "2d6+3",
        dice: [
          { type: "d6", value: 4 },
          { type: "d6", value: 5 },
          { type: "mod" as const, value: 3 },
        ],
        total: 12,
      });

      await appendRollEntry("player-1", "Gandalf", entry1);
      await appendRollEntry("player-1", "Gandalf", entry2);

      const playerLog = obrConfig.sceneMetadata[`${LOG_KEY_PREFIX}player-1`] as {
        name: string;
        rolls: RollEntry[];
      };
      expect(playerLog.rolls).toHaveLength(2);
      expect(playerLog.rolls[0]).toEqual(entry1);
      expect(playerLog.rolls[1]).toEqual(entry2);

      const sceneId = obrConfig.sceneMetadata[SCENE_ID_KEY] as string;
      const manifest = obrConfig.roomMetadata[MANIFEST_KEY] as Record<
        string,
        SceneLogManifest
      >;
      expect(manifest[sceneId].rollCount).toBe(2);
      expect(manifest[sceneId].playerCount).toBe(1);
      expect(manifest[sceneId].lastUpdated).toBe(entry2.timestamp);
    });

    it("increments playerCount for new players", async () => {
      obrConfig.sceneItems = [
        { id: "item-1", name: "Forest", layer: "MAP", type: "IMAGE" },
      ];

      const entry1 = makeEntry({ timestamp: "2026-04-28T12:00:00.000Z" });
      const entry2 = makeEntry({ timestamp: "2026-04-28T12:01:00.000Z" });

      await appendRollEntry("player-1", "Gandalf", entry1);
      await appendRollEntry("player-2", "Frodo", entry2);

      const sceneId = obrConfig.sceneMetadata[SCENE_ID_KEY] as string;
      const manifest = obrConfig.roomMetadata[MANIFEST_KEY] as Record<
        string,
        SceneLogManifest
      >;
      expect(manifest[sceneId].playerCount).toBe(2);
      expect(manifest[sceneId].rollCount).toBe(2);
    });

    it("uses 'Unknown Scene' when no MAP layer items exist", async () => {
      obrConfig.sceneItems = [];

      const entry = makeEntry();
      await appendRollEntry("player-1", "Gandalf", entry);

      const sceneId = obrConfig.sceneMetadata[SCENE_ID_KEY] as string;
      const manifest = obrConfig.roomMetadata[MANIFEST_KEY] as Record<
        string,
        SceneLogManifest
      >;
      expect(manifest[sceneId].sceneName).toBe("Unknown Scene");
    });

    it("ignores non-IMAGE items on the MAP layer", async () => {
      obrConfig.sceneItems = [
        { id: "shape-1", name: "Rectangle", layer: "MAP", type: "SHAPE" },
        { id: "img-1", name: "Dragon's Lair", layer: "MAP", type: "IMAGE" },
      ];

      const entry = makeEntry();
      await appendRollEntry("player-1", "Gandalf", entry);

      const sceneId = obrConfig.sceneMetadata[SCENE_ID_KEY] as string;
      const manifest = obrConfig.roomMetadata[MANIFEST_KEY] as Record<
        string,
        SceneLogManifest
      >;
      expect(manifest[sceneId].sceneName).toBe("Dragon's Lair");
    });

    it("reuses existing scene ID", async () => {
      obrConfig.sceneMetadata[SCENE_ID_KEY] = "existing-scene-id";
      obrConfig.sceneItems = [
        { id: "item-1", name: "Castle", layer: "MAP", type: "IMAGE" },
      ];

      const entry = makeEntry();
      await appendRollEntry("player-1", "Gandalf", entry);

      expect(obrConfig.sceneMetadata[SCENE_ID_KEY]).toBe("existing-scene-id");

      const manifest = obrConfig.roomMetadata[MANIFEST_KEY] as Record<
        string,
        SceneLogManifest
      >;
      expect(manifest["existing-scene-id"]).toBeDefined();
    });
  });

  describe("clearPlayerLogs", () => {
    it("clears scene logs and manifest entry", async () => {
      obrConfig.sceneItems = [
        { id: "item-1", name: "Dungeon Map", layer: "MAP", type: "IMAGE" },
      ];

      // Set up some logs first
      const entry = makeEntry();
      await appendRollEntry("player-1", "Gandalf", entry);
      await appendRollEntry("player-2", "Frodo", entry);

      const sceneId = obrConfig.sceneMetadata[SCENE_ID_KEY] as string;

      // Verify they exist before clearing
      expect(obrConfig.sceneMetadata[`${LOG_KEY_PREFIX}player-1`]).toBeDefined();
      expect(obrConfig.sceneMetadata[`${LOG_KEY_PREFIX}player-2`]).toBeDefined();

      await clearPlayerLogs();

      // Player logs should be removed from scene metadata
      expect(obrConfig.sceneMetadata[`${LOG_KEY_PREFIX}player-1`]).toBeUndefined();
      expect(obrConfig.sceneMetadata[`${LOG_KEY_PREFIX}player-2`]).toBeUndefined();

      // Manifest entry should be removed
      const manifest = obrConfig.roomMetadata[MANIFEST_KEY] as Record<
        string,
        SceneLogManifest
      >;
      expect(manifest[sceneId]).toBeUndefined();
    });

    it("preserves scene ID after clearing", async () => {
      obrConfig.sceneItems = [
        { id: "item-1", name: "Dungeon Map", layer: "MAP", type: "IMAGE" },
      ];

      const entry = makeEntry();
      await appendRollEntry("player-1", "Gandalf", entry);

      const sceneId = obrConfig.sceneMetadata[SCENE_ID_KEY] as string;

      await clearPlayerLogs();

      // Scene ID should still be present
      expect(obrConfig.sceneMetadata[SCENE_ID_KEY]).toBe(sceneId);
    });
  });
});
