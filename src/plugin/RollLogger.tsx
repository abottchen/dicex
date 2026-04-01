import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useRef } from "react";
import { useDiceRollStore } from "../dice/store";
import { useDiceControlsStore } from "../controls/store";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { getCombinedDiceValue } from "../helpers/getCombinedDiceValue";
import { buildRollEntry } from "./buildRollEntry";
import { DieResult, ModifierResult } from "../types/RollResult";

const LOG_KEY_PREFIX = "com.dicex/roll-log/";

export function RollLogger() {
  const prevFinished = useRef(false);

  useEffect(
    () =>
      useDiceRollStore.subscribe((state) => {
        if (!state.roll) {
          prevFinished.current = false;
          return;
        }

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

        if (controlsState.diceBonus !== 0) {
          diceResults.push({
            type: "mod",
            value: controlsState.diceBonus,
          });
        }

        const advantage =
          controlsState.diceAdvantage === "ADVANTAGE"
            ? ("adv" as const)
            : controlsState.diceAdvantage === "DISADVANTAGE"
            ? ("dis" as const)
            : undefined;

        // Build notation from dice counts
        const counts = controlsState.diceCounts;
        const diceById = controlsState.diceById;
        const notationParts: string[] = [];
        for (const [id, count] of Object.entries(counts)) {
          if (count > 0) {
            const die = diceById[id];
            if (die) {
              notationParts.push(`${count}${die.type.toLowerCase()}`);
            }
          }
        }
        if (controlsState.diceBonus > 0) {
          notationParts.push(`+${controlsState.diceBonus}`);
        } else if (controlsState.diceBonus < 0) {
          notationParts.push(`${controlsState.diceBonus}`);
        }
        const notation = notationParts.join("+") || "unknown";

        const entry = buildRollEntry({
          diceResults,
          total,
          notation,
          advantage,
        });

        const playerId = OBR.player.id;
        const logKey = `${LOG_KEY_PREFIX}${playerId}`;
        OBR.room.getMetadata().then((metadata) => {
          const existing = (metadata[logKey] as { name: string; rolls: unknown[] } | undefined) || {
            name: OBR.player.name,
            rolls: [],
          };
          existing.rolls.push(entry);
          existing.name = OBR.player.name;
          OBR.room.setMetadata({ [logKey]: existing });
        });
      }),
    []
  );

  return null;
}
