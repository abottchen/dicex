import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useRef } from "react";
import { useDiceRollStore } from "../dice/store";
import { useDiceControlsStore } from "../controls/store";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { getCombinedDiceValue } from "../helpers/getCombinedDiceValue";
import { buildRollEntry } from "./buildRollEntry";
import { DieResult, ModifierResult, RollEntry } from "../types/RollResult";

const LOG_KEY_PREFIX = "com.dicex/roll-log/";

export function RollLogger() {
  const prevFinished = useRef(false);
  const prevIds = useRef<string[]>([]);

  useEffect(
    () =>
      useDiceRollStore.subscribe((state) => {
        if (!state.roll) {
          prevFinished.current = false;
          prevIds.current = [];
          return;
        }

        // Reset prevFinished when die IDs change (reroll / manual throw)
        const ids = getDieFromDice(state.roll).map((die) => die.id);
        if (
          ids.length !== prevIds.current.length ||
          !ids.every((id, i) => id === prevIds.current[i])
        ) {
          prevFinished.current = false;
        }
        prevIds.current = ids;

        const allFinished = Object.values(state.rollValues).every(
          (v) => v !== null
        );
        if (!allFinished || prevFinished.current) {
          return;
        }
        prevFinished.current = true;

        const values = state.rollValues as Record<string, number>;
        const roll = state.roll;
        const controlsState = useDiceControlsStore.getState();
        const total = getCombinedDiceValue(roll, values);
        if (total === null) return;

        const allDice = getDieFromDice(roll);
        const diceResults: (DieResult | ModifierResult)[] = allDice.map(
          (die) => ({
            type: die.type.toLowerCase(),
            value: values[die.id],
          })
        );

        const bonus = roll.bonus ?? 0;
        if (bonus !== 0) {
          diceResults.push({
            type: "mod",
            value: bonus,
          });
        }

        const hasHighest = roll.dice.some(
          (d) => "combination" in d && d.combination === "HIGHEST"
        );
        const hasLowest = roll.dice.some(
          (d) => "combination" in d && d.combination === "LOWEST"
        );
        const advantage = hasHighest
          ? ("adv" as const)
          : hasLowest
          ? ("dis" as const)
          : undefined;

        const notation = controlsState.activeNotation || "unknown";

        const presetName = controlsState.activePresetName ?? undefined;
        const entry = buildRollEntry({
          diceResults,
          total,
          notation,
          advantage,
          preset: presetName,
        });

        const playerId = OBR.player.id;
        const logKey = `${LOG_KEY_PREFIX}${playerId}`;
        Promise.all([
          OBR.player.getName(),
          OBR.room.getMetadata(),
        ]).then(([playerName, metadata]) => {
          const existing = (metadata[logKey] as { name: string; rolls: RollEntry[] } | undefined) || {
            name: playerName,
            rolls: [],
          };
          existing.rolls.push(entry);
          existing.name = playerName;
          OBR.room.setMetadata({ [logKey]: existing });
        });
      }),
    []
  );

  return null;
}
