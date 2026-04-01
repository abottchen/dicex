import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useRef } from "react";
import { useDiceRollStore } from "../dice/store";
import { useDiceControlsStore } from "../controls/store";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { buildDiceResults } from "../helpers/buildDiceResults";
import { buildRollEntry } from "./buildRollEntry";
import { RollEntry } from "../types/RollResult";

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

        const roll = state.roll;
        const values = state.rollValues as Record<string, number>;
        const controlsState = useDiceControlsStore.getState();

        const result = buildDiceResults({
          roll,
          rollValues: values,
          activeNotation: controlsState.activeNotation,
          activePresetName: controlsState.activePresetName,
          activeNotationComponents: controlsState.activeNotationComponents,
        });

        const entry = buildRollEntry({
          diceResults: result.dice,
          total: result.total,
          notation: result.notation || "unknown",
          advantage: result.advantage,
          preset: result.presetName,
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
