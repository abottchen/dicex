import { describe, it, expect, beforeEach } from "vitest";
import { useDiceRollStore } from "./store";
import { Die } from "../types/Die";
import { DiceRoll } from "../types/DiceRoll";

function createDie(id: string, type: string = "D6"): Die {
  return { id, style: "IRON" as any, type: type as any };
}

const dummyTransform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
};

describe("useDiceRollStore.addExplosionDice", () => {
  beforeEach(() => {
    useDiceRollStore.getState().clearRoll();
  });

  it("appends new dice to rollValues and rollThrows without clearing existing", () => {
    const roll: DiceRoll = { dice: [createDie("d1"), createDie("d2")] };
    useDiceRollStore.getState().startRoll(roll);

    const ids = Object.keys(useDiceRollStore.getState().rollValues);
    ids.forEach((id) => {
      useDiceRollStore.getState().finishDieRoll(id, 6, dummyTransform);
    });

    const stateBeforeExplosion = useDiceRollStore.getState();
    expect(Object.keys(stateBeforeExplosion.rollValues)).toHaveLength(2);
    expect(Object.values(stateBeforeExplosion.rollValues).every((v) => v !== null)).toBe(true);

    const explosionDie: Die = { id: "exp1", style: "IRON" as any, type: "D6" as any, isExplosion: true };
    const explosionThrow = {
      position: { x: 0, y: 1, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      linearVelocity: { x: 0.1, y: 0, z: -0.1 },
      angularVelocity: { x: 1, y: 1, z: 1 },
    };
    useDiceRollStore.getState().addExplosionDice(
      [explosionDie],
      { exp1: explosionThrow }
    );

    const stateAfter = useDiceRollStore.getState();
    expect(Object.keys(stateAfter.rollValues)).toHaveLength(3);
    ids.forEach((id) => {
      expect(stateAfter.rollValues[id]).toBe(6);
    });
    expect(stateAfter.rollValues["exp1"]).toBeNull();
    expect(stateAfter.rollThrows["exp1"]).toEqual(explosionThrow);
  });

  it("appends explosion dice to the roll's dice array", () => {
    const roll: DiceRoll = { dice: [createDie("d1")] };
    useDiceRollStore.getState().startRoll(roll);

    const explosionDie: Die = { id: "exp1", style: "IRON" as any, type: "D6" as any, isExplosion: true };
    const explosionThrow = {
      position: { x: 0, y: 1, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      linearVelocity: { x: 0.1, y: 0, z: -0.1 },
      angularVelocity: { x: 1, y: 1, z: 1 },
    };
    useDiceRollStore.getState().addExplosionDice(
      [explosionDie],
      { exp1: explosionThrow }
    );

    const state = useDiceRollStore.getState();
    expect(state.roll!.dice).toHaveLength(2);
    const lastDie = state.roll!.dice[1] as Die;
    expect(lastDie.id).toBe("exp1");
    expect(lastDie.isExplosion).toBe(true);
  });
});
