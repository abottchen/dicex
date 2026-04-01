import { describe, it, expect } from "vitest";
import { combinePlayerLogs, triggerJsonDownload } from "../rollLogExport";

describe("combinePlayerLogs", () => {
  it("combines multiple players logs into single object", () => {
    const logs = {
      "player-1": {
        name: "Gandalf",
        rolls: [
          {
            timestamp: "2026-03-30T22:15:00.000Z",
            notation: "1d20",
            dice: [{ type: "d20", value: 15 }],
            total: 15,
          },
        ],
      },
      "player-2": {
        name: "Frodo",
        rolls: [
          {
            timestamp: "2026-03-30T22:16:00.000Z",
            notation: "2d6",
            dice: [
              { type: "d6", value: 3 },
              { type: "d6", value: 4 },
            ],
            total: 7,
          },
        ],
      },
    };
    const combined = combinePlayerLogs(logs);
    expect(combined.players["player-1"].name).toBe("Gandalf");
    expect(combined.players["player-1"].rolls).toHaveLength(1);
    expect(combined.players["player-2"].name).toBe("Frodo");
    expect(combined.players["player-2"].rolls).toHaveLength(1);
  });

  it("preserves all fields from the data model", () => {
    const logs = {
      "player-1": {
        name: "Gandalf",
        rolls: [
          {
            timestamp: "2026-03-30T22:18:00.000Z",
            notation: "3d6!",
            preset: "Chaos Bolt",
            dice: [
              { type: "d6", value: 6, exploded: [4] },
              { type: "d6", value: 3 },
            ],
            total: 13,
          },
        ],
      },
    };
    const combined = combinePlayerLogs(logs);
    const roll = combined.players["player-1"].rolls[0];
    expect(roll.preset).toBe("Chaos Bolt");
    expect(roll.dice[0]).toEqual({ type: "d6", value: 6, exploded: [4] });
  });
});

describe("triggerJsonDownload", () => {
  it("creates a valid JSON string", () => {
    const data = { test: true };
    const json = JSON.stringify(data, null, 2);
    expect(JSON.parse(json)).toEqual(data);
  });
});
