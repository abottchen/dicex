import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  obrCalls, resetStores, resetObrCalls, flushPromises,
} from "./setup";
import { useDiceControlsStore } from "../controls/store";
import { useDiceRollStore } from "../dice/store";
import { createRumbleSyncSubscription } from "../plugin/rumbleSyncSubscription";
import { createRollLoggerSubscription } from "../plugin/rollLoggerSubscription";
import { parseNotation } from "../helpers/notationParser";
import { DiceRoll } from "../types/DiceRoll";
import { Die } from "../types/Die";
import { DiceStyle } from "../types/DiceStyle";

const RUMBLE_CHAT_KEY = "com.battle-system.friends/metadata_chatlog";
const LOG_KEY_PREFIX = "com.dicex/roll-log/";

function createTestDie(type: string, id: string): Die {
  return { id, type: type as any, style: "IRON" as DiceStyle };
}

describe("advanced roll integration", () => {
  let unsubRumble: () => void;
  let unsubLogger: () => void;

  beforeEach(() => {
    resetStores();
    resetObrCalls();
    unsubRumble = createRumbleSyncSubscription();
    unsubLogger = createRollLoggerSubscription();
  });

  afterEach(() => {
    unsubRumble();
    unsubLogger();
  });

  it("keep 4d6k3 drops lowest die", async () => {
    const components = parseNotation("4d6k3");
    useDiceControlsStore.setState({
      activeNotation: "4d6k3",
      activeNotationComponents: components,
    });

    const dice: Die[] = [
      createTestDie("D6", "k1"),
      createTestDie("D6", "k2"),
      createTestDie("D6", "k3"),
      createTestDie("D6", "k4"),
    ];
    const roll: DiceRoll = { dice };
    useDiceRollStore.getState().startRoll(roll);

    // Read actual IDs assigned by startRoll
    const ids = Object.keys(useDiceRollStore.getState().rollValues);
    const values = [5, 2, 4, 6];
    const dummyTransform = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } };
    ids.forEach((id, i) => {
      useDiceRollStore.getState().finishDieRoll(id, values[i], dummyTransform);
    });

    await flushPromises();

    // Check Rumble message
    const chat = (obrCalls.playerSetMetadata[0] as any)[RUMBLE_CHAT_KEY];
    expect(chat.chatlog).toContain("\uD83D\uDEAB"); // drop emoji
    expect(chat.chatlog).toContain("for **15**!"); // 5+4+6, dropping 2

    // Check audit log
    const logKey = `${LOG_KEY_PREFIX}player-1`;
    const entry = (obrCalls.roomSetMetadata[0] as any)[logKey].rolls[0];
    expect(entry.total).toBe(15);
    const dropped = entry.dice.filter((d: any) => d.dropped);
    expect(dropped.length).toBe(1);
    expect(dropped[0].value).toBe(2);
  });

  it("drop 4d6d1 drops lowest die", async () => {
    const components = parseNotation("4d6d1");
    useDiceControlsStore.setState({
      activeNotation: "4d6d1",
      activeNotationComponents: components,
    });

    const dice: Die[] = [
      createTestDie("D6", "d1"),
      createTestDie("D6", "d2"),
      createTestDie("D6", "d3"),
      createTestDie("D6", "d4"),
    ];
    const roll: DiceRoll = { dice };
    useDiceRollStore.getState().startRoll(roll);

    const ids = Object.keys(useDiceRollStore.getState().rollValues);
    const values = [3, 1, 5, 4];
    const dummyTransform = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } };
    ids.forEach((id, i) => {
      useDiceRollStore.getState().finishDieRoll(id, values[i], dummyTransform);
    });

    await flushPromises();

    const chat = (obrCalls.playerSetMetadata[0] as any)[RUMBLE_CHAT_KEY];
    expect(chat.chatlog).toContain("for **12**!"); // 3+5+4, dropping 1

    const logKey = `${LOG_KEY_PREFIX}player-1`;
    const entry = (obrCalls.roomSetMetadata[0] as any)[logKey].rolls[0];
    expect(entry.total).toBe(12);
  });

  it("exploding 3d6! triggers explosions on max value", async () => {
    // Mock Math.random to return 0.5 (which gives floor(0.5*6)+1 = 4 for d6)
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const components = parseNotation("3d6!");
    useDiceControlsStore.setState({
      activeNotation: "3d6!",
      activeNotationComponents: components,
    });

    const dice: Die[] = [
      createTestDie("D6", "e1"),
      createTestDie("D6", "e2"),
      createTestDie("D6", "e3"),
    ];
    const roll: DiceRoll = { dice };
    useDiceRollStore.getState().startRoll(roll);

    const ids = Object.keys(useDiceRollStore.getState().rollValues);
    // Die 1 rolls 6 (should explode), die 2 rolls 3 (no explode), die 3 rolls 6 (explode)
    const values = [6, 3, 6];
    const dummyTransform = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } };
    ids.forEach((id, i) => {
      useDiceRollStore.getState().finishDieRoll(id, values[i], dummyTransform);
    });

    await flushPromises();

    const chat = (obrCalls.playerSetMetadata[0] as any)[RUMBLE_CHAT_KEY];
    // Should contain explosion emoji for the 6s
    expect(chat.chatlog).toContain("\uD83D\uDCA5"); // explosion emoji
    // Total: 6+4(explosion) + 3 + 6+4(explosion) = 23
    expect(chat.chatlog).toContain("for **23**!");

    randomSpy.mockRestore();
  });

  it("physical explosion dice are added to the roll and included in totals", async () => {
    const components = parseNotation("2d6!");
    useDiceControlsStore.setState({
      activeNotation: "2d6!",
      activeNotationComponents: components,
    });

    const dice: Die[] = [
      createTestDie("D6", "p1"),
      createTestDie("D6", "p2"),
    ];
    const roll: DiceRoll = { dice };
    useDiceRollStore.getState().startRoll(roll);

    // Finish initial dice: first die rolls 6 (should explode), second rolls 3
    const ids = Object.keys(useDiceRollStore.getState().rollValues);
    const dummyTransform = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } };
    useDiceRollStore.getState().finishDieRoll(ids[0], 6, dummyTransform);
    useDiceRollStore.getState().finishDieRoll(ids[1], 3, dummyTransform);

    // Simulate what useExplosionWaves would do:
    // Add an explosion die for the die that rolled 6
    const explosionDie: Die = {
      id: "exp-1",
      style: "IRON" as DiceStyle,
      type: "D6" as any,
      isExplosion: true,
    };
    const explosionThrow = {
      position: { x: 0, y: 1, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      linearVelocity: { x: 0.1, y: 0, z: -0.1 },
      angularVelocity: { x: 1, y: 1, z: 1 },
    };
    useDiceRollStore.getState().addExplosionDice([explosionDie], { "exp-1": explosionThrow });

    // Verify the explosion die is in rollValues as null (unfinished)
    expect(useDiceRollStore.getState().rollValues["exp-1"]).toBeNull();

    // Finish the explosion die with value 4
    useDiceRollStore.getState().finishDieRoll("exp-1", 4, dummyTransform);

    // All dice should now be settled
    const finalValues = useDiceRollStore.getState().rollValues;
    expect(Object.values(finalValues).every((v) => v !== null)).toBe(true);

    // Verify the roll structure includes the explosion die
    const finalRoll = useDiceRollStore.getState().roll!;
    expect(finalRoll.dice).toHaveLength(3);

    // Build results with physicalExplosions flag
    const { buildDiceResults } = await import("../helpers/buildDiceResults");
    const result = buildDiceResults({
      roll: finalRoll,
      rollValues: finalValues as Record<string, number>,
      activeNotationComponents: components,
      physicalExplosions: true,
    });

    // Total: 6 + 3 + 4 = 13 (no silent explosion double-counting)
    expect(result.total).toBe(13);
  });
});
