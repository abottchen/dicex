import { describe, it, expect } from "vitest";
import { getRumbleTargets } from "./getRumbleTargets";

describe("getRumbleTargets", () => {
  it("returns party target for normal roll", () => {
    const targets = getRumbleTargets({
      hidden: false,
      playerObrId: "player-1",
      gmObrId: "gm-1",
      playerRole: "PLAYER",
    });
    expect(targets).toEqual(["0000"]);
  });

  it("returns player and GM targets for hidden roll by player", () => {
    const targets = getRumbleTargets({
      hidden: true,
      playerObrId: "player-1",
      gmObrId: "gm-1",
      playerRole: "PLAYER",
    });
    expect(targets).toEqual(["player-1", "gm-1"]);
  });

  it("returns only GM target for hidden roll by GM (no duplicate)", () => {
    const targets = getRumbleTargets({
      hidden: true,
      playerObrId: "gm-1",
      gmObrId: "gm-1",
      playerRole: "GM",
    });
    expect(targets).toEqual(["gm-1"]);
  });
});
