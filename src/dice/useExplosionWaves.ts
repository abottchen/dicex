import { useEffect, useRef } from "react";
import { useDiceRollStore } from "./store";
import { useDiceControlsStore } from "../controls/store";
import { getExplosionDice } from "../helpers/explosionWaves";
import { getRandomDiceThrow } from "../helpers/DiceThrower";
import { DiceComponent, isModifierComponent } from "../helpers/notationParser";
import { DiceThrow } from "../types/DiceThrow";
import { Die } from "../types/Die";

const MAX_EXPLOSION_WAVES = 6;
const EXPLOSION_SPEED_MULTIPLIER = 0.3;

/**
 * Orchestrates exploding dice waves. After each wave of dice settles,
 * checks for explosions and spawns new physics dice if needed.
 *
 * Returns `true` while explosion waves are still in progress
 * (i.e., the roll should not be considered "finished" yet).
 */
export function useExplosionWaves(): boolean {
  const waveCountRef = useRef(0);
  const pendingExplosionIdsRef = useRef<Set<string>>(new Set());
  const isActiveRef = useRef(false);

  const rollValues = useDiceRollStore((state) => state.rollValues);
  const roll = useDiceRollStore((state) => state.roll);
  const addExplosionDice = useDiceRollStore((state) => state.addExplosionDice);

  const activeNotationComponents = useDiceControlsStore(
    (state) => state.activeNotationComponents
  );

  // Determine if the current notation has any explode configs
  const diceComponents: DiceComponent[] = (activeNotationComponents ?? []).filter(
    (c): c is DiceComponent => !isModifierComponent(c)
  );
  const hasExplodeConfig = diceComponents.some((c) => c.explode);

  // Reset wave state when a new roll starts
  useEffect(() => {
    if (roll) {
      waveCountRef.current = 0;
      pendingExplosionIdsRef.current.clear();
      isActiveRef.current = hasExplodeConfig;
    }
  }, [roll, hasExplodeConfig]);

  // Check for explosions when dice settle
  useEffect(() => {
    if (!isActiveRef.current || !roll) return;
    if (waveCountRef.current >= MAX_EXPLOSION_WAVES) {
      isActiveRef.current = false;
      return;
    }

    // Check if all current dice have settled
    const values = Object.entries(rollValues);
    if (values.length === 0) return;
    const allSettled = values.every(([, v]) => v !== null);
    if (!allSettled) return;

    // Gather the dice that just settled in this wave
    // On the first wave, all dice are candidates; on subsequent waves,
    // only the explosion dice from the previous wave are candidates
    const pendingIds = pendingExplosionIdsRef.current;
    const allDice = roll.dice;

    const settledDice: { die: Die; value: number }[] = [];
    for (const dieOrDice of allDice) {
      if ("id" in dieOrDice) {
        const die = dieOrDice as Die;
        const value = rollValues[die.id];
        if (value === null || value === undefined) continue;
        // On wave 0, check all dice. On later waves, only check dice from previous wave.
        if (waveCountRef.current === 0 || pendingIds.has(die.id)) {
          settledDice.push({ die, value });
        }
      }
    }

    const newDice = getExplosionDice(settledDice, diceComponents);

    if (newDice.length === 0) {
      // No more explosions — we're done
      isActiveRef.current = false;
      return;
    }

    // Generate throws for the new dice
    const newThrows: Record<string, DiceThrow> = {};
    for (const die of newDice) {
      newThrows[die.id] = getRandomDiceThrow(EXPLOSION_SPEED_MULTIPLIER);
    }

    // Track which IDs we're waiting on for the next wave
    pendingExplosionIdsRef.current = new Set(newDice.map((d) => d.id));
    waveCountRef.current++;

    addExplosionDice(newDice, newThrows);
  }, [rollValues, roll, diceComponents, addExplosionDice]);

  return isActiveRef.current && hasExplodeConfig;
}
