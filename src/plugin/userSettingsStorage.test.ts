import { describe, it, expect, beforeEach } from "vitest";
import {
  obrConfig,
  resetObrCalls,
} from "../integration/setup";
import {
  loadSetting,
  saveSetting,
} from "./userSettingsStorage";

describe("userSettingsStorage", () => {
  beforeEach(() => {
    resetObrCalls();
  });

  it("returns fallback when setting is absent", async () => {
    const value = await loadSetting<boolean>(
      "notation-input-enabled",
      "player-1",
      false
    );
    expect(value).toBe(false);
  });

  it("round-trips a boolean value", async () => {
    await saveSetting("notation-input-enabled", "player-1", true);
    const value = await loadSetting<boolean>(
      "notation-input-enabled",
      "player-1",
      false
    );
    expect(value).toBe(true);
  });

  it("writes to a per-setting, per-player metadata key", async () => {
    await saveSetting("notation-input-enabled", "player-1", true);
    expect(
      obrConfig.roomMetadata["com.dicex/notation-input-enabled/player-1"]
    ).toBe(true);
  });

  it("keeps different settings in independent keys", async () => {
    await saveSetting("notation-input-enabled", "player-1", true);
    await saveSetting("explosion-glow-color", "player-1", "#ff0000");

    const enabled = await loadSetting<boolean>(
      "notation-input-enabled",
      "player-1",
      false
    );
    const color = await loadSetting<string>(
      "explosion-glow-color",
      "player-1",
      "#ffffff"
    );

    expect(enabled).toBe(true);
    expect(color).toBe("#ff0000");
  });
});
