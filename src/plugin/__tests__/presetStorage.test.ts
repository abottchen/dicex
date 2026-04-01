import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  savePreset,
  loadPresets,
  deletePreset,
  updatePreset,
  Preset,
} from "../presetStorage";

// Mock OBR SDK
const mockMetadata: Record<string, unknown> = {};
vi.mock("@owlbear-rodeo/sdk", () => ({
  default: {
    room: {
      getMetadata: vi.fn(() => Promise.resolve({ ...mockMetadata })),
      setMetadata: vi.fn((data: Record<string, unknown>) => {
        Object.assign(mockMetadata, data);
        return Promise.resolve();
      }),
    },
  },
}));

// Mock uuid
vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-" + Math.random().toString(36).slice(2, 8)),
}));

const PLAYER_ID = "player-1";
const PRESET_KEY = `com.dicex/presets/${PLAYER_ID}`;

describe("presetStorage", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockMetadata)) {
      delete mockMetadata[key];
    }
  });

  it("saves a preset to room metadata", async () => {
    await savePreset(PLAYER_ID, "Fireball", "6d8+3");
    const stored = mockMetadata[PRESET_KEY] as { presets: Preset[] };
    expect(stored.presets).toHaveLength(1);
    expect(stored.presets[0].name).toBe("Fireball");
    expect(stored.presets[0].notation).toBe("6d8+3");
    expect(stored.presets[0].id).toBeDefined();
  });

  it("loads presets from room metadata", async () => {
    mockMetadata[PRESET_KEY] = {
      presets: [{ id: "1", name: "Fireball", notation: "6d8+3" }],
    };
    const presets = await loadPresets(PLAYER_ID);
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe("Fireball");
  });

  it("returns empty array when no presets exist", async () => {
    const presets = await loadPresets(PLAYER_ID);
    expect(presets).toEqual([]);
  });

  it("deletes a preset by ID", async () => {
    mockMetadata[PRESET_KEY] = {
      presets: [
        { id: "1", name: "Fireball", notation: "6d8+3" },
        { id: "2", name: "Attack", notation: "1d20+7" },
      ],
    };
    await deletePreset(PLAYER_ID, "1");
    const stored = mockMetadata[PRESET_KEY] as { presets: Preset[] };
    expect(stored.presets).toHaveLength(1);
    expect(stored.presets[0].id).toBe("2");
  });

  it("updates a preset name and notation by ID", async () => {
    mockMetadata[PRESET_KEY] = {
      presets: [{ id: "1", name: "Fireball", notation: "6d8+3" }],
    };
    await updatePreset(PLAYER_ID, "1", {
      name: "Greater Fireball",
      notation: "8d8+5",
    });
    const stored = mockMetadata[PRESET_KEY] as { presets: Preset[] };
    expect(stored.presets[0].name).toBe("Greater Fireball");
    expect(stored.presets[0].notation).toBe("8d8+5");
  });

  it("rejects saving preset with invalid notation", async () => {
    await expect(
      savePreset(PLAYER_ID, "Bad", "2d7")
    ).rejects.toThrow();
  });
});
