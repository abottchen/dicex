import create from "zustand";
import { immer } from "zustand/middleware/immer";
import { WritableDraft } from "immer/dist/types/types-external";

import { DiceRoll } from "../types/DiceRoll";
import { Die, isDie } from "../types/Die";
import { isDice } from "../types/Dice";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { DiceTransform } from "../types/DiceTransform";
import { getRandomDiceThrow } from "../helpers/DiceThrower";
import { generateDiceId } from "../helpers/generateDiceId";
import { DiceThrow } from "../types/DiceThrow";

interface DiceRollState {
  roll: DiceRoll | null;
  /**
   * A mapping from the die ID to its roll result.
   * A value of `null` means the die hasn't finished rolling yet.
   */
  rollValues: Record<string, number | null>;
  /**
   * A mapping from the die ID to its final roll transform.
   * A value of `null` means the die hasn't finished rolling yet.
   */
  rollTransforms: Record<string, DiceTransform | null>;
  /**
   * A mapping from the die ID to its initial roll throw state.
   */
  rollThrows: Record<string, DiceThrow>;
  /**
   * Monotonically increasing counter that increments only when startRoll
   * is called. Used by useExplosionWaves to distinguish new rolls from
   * explosion dice additions (which also mutate `roll`).
   */
  rollGeneration: number;
  /**
   * True while explosion waves are still being processed.
   * Used to prevent the roll logger from firing prematurely.
   */
  explosionWavesActive: boolean;
  startRoll: (roll: DiceRoll, speedMultiplier?: number) => void;
  clearRoll: (ids?: string) => void;
  /** Reroll select ids of dice or reroll all dice by passing `undefined` */
  reroll: (ids?: string[], manualThrows?: Record<string, DiceThrow>) => void;
  finishDieRoll: (id: string, number: number, transform: DiceTransform) => void;
  /** Add explosion dice to an in-progress roll without resetting existing dice */
  addExplosionDice: (dice: Die[], throws: Record<string, DiceThrow>) => void;
  setExplosionWavesActive: (active: boolean) => void;
}

export const useDiceRollStore = create<DiceRollState>()(
  immer((set) => ({
    roll: null,
    rollValues: {},
    rollTransforms: {},
    rollThrows: {},
    rollGeneration: 0,
    explosionWavesActive: false,
    startRoll: (roll, speedMultiplier?: number) =>
      set((state) => {
        state.roll = roll;
        state.rollValues = {};
        state.rollTransforms = {};
        state.rollThrows = {};
        state.rollGeneration++;
        state.explosionWavesActive = false;
        // Set all values to null
        const dice = getDieFromDice(roll);
        for (const die of dice) {
          state.rollValues[die.id] = null;
          state.rollTransforms[die.id] = null;
          state.rollThrows[die.id] = getRandomDiceThrow(speedMultiplier);
        }
      }),
    clearRoll: () =>
      set((state) => {
        state.roll = null;
        state.rollValues = {};
        state.rollTransforms = {};
        state.rollThrows = {};
        state.explosionWavesActive = false;
      }),
    reroll: (ids, manualThrows) => {
      set((state) => {
        if (state.roll) {
          // Remove explosion dice and their associated state before rerolling
          // so we only reroll the original dice from the roll definition
          const explosionIds = new Set<string>();
          state.roll.dice = state.roll.dice.filter((dieOrDice) => {
            if (isDie(dieOrDice) && dieOrDice.isExplosion) {
              explosionIds.add(dieOrDice.id);
              return false;
            }
            return true;
          });
          for (const id of explosionIds) {
            delete state.rollValues[id];
            delete state.rollTransforms[id];
            delete state.rollThrows[id];
          }

          rerollDraft(
            state.roll,
            ids,
            manualThrows,
            state.rollValues,
            state.rollTransforms,
            state.rollThrows
          );
          // Bump generation so useExplosionWaves resets and can detect
          // new explosions from the rerolled dice
          state.rollGeneration++;
        }
      });
    },
    finishDieRoll: (id, number, transform) => {
      set((state) => {
        state.rollValues[id] = number;
        state.rollTransforms[id] = transform;
      });
    },
    addExplosionDice: (dice, throws) => {
      set((state) => {
        if (!state.roll) return;
        for (const die of dice) {
          state.roll.dice.push(die as any);
        }
        for (const die of dice) {
          state.rollValues[die.id] = null;
          state.rollTransforms[die.id] = null;
          state.rollThrows[die.id] = throws[die.id];
        }
      });
    },
    setExplosionWavesActive: (active) => {
      set((state) => {
        state.explosionWavesActive = active;
      });
    },
  }))
);

/** Recursively update the ids of a draft to reroll dice */
function rerollDraft(
  diceRoll: WritableDraft<DiceRoll>,
  ids: string[] | undefined,
  manualThrows: Record<string, DiceThrow> | undefined,
  rollValues: WritableDraft<Record<string, number | null>>,
  rollTransforms: WritableDraft<Record<string, DiceTransform | null>>,
  rollThrows: WritableDraft<Record<string, DiceThrow>>
) {
  for (let dieOrDice of diceRoll.dice) {
    if (isDie(dieOrDice)) {
      if (!ids || ids.includes(dieOrDice.id)) {
        delete rollValues[dieOrDice.id];
        delete rollTransforms[dieOrDice.id];
        delete rollThrows[dieOrDice.id];
        const manualThrow = manualThrows?.[dieOrDice.id];
        const id = generateDiceId();
        dieOrDice.id = id;
        rollValues[id] = null;
        rollTransforms[id] = null;
        if (manualThrow) {
          rollThrows[id] = manualThrow;
        } else {
          rollThrows[id] = getRandomDiceThrow();
        }
      }
    } else if (isDice(dieOrDice)) {
      rerollDraft(
        dieOrDice,
        ids,
        manualThrows,
        rollValues,
        rollTransforms,
        rollThrows
      );
    }
  }
}
