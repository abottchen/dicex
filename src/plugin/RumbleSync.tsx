import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useRef } from "react";
import { useDiceRollStore } from "../dice/store";
import { useDiceControlsStore } from "../controls/store";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { getCombinedDiceValue } from "../helpers/getCombinedDiceValue";
import { formatRumbleMessage } from "./formatRumbleMessage";
import { getRumbleTargets } from "./getRumbleTargets";
import { DieResult, ModifierResult } from "../types/RollResult";

const RUMBLE_CHAT_KEY = "com.battle-system.friends/metadata_chatlog";

export function RumbleSync() {
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

        const presetName = controlsState.activePresetName ?? undefined;
        const notation = controlsState.activeNotation ?? undefined;
        const hidden = roll.hidden ?? false;
        const playerObrId = OBR.player.id;

        Promise.all([
          OBR.player.getName(),
          OBR.player.getRole(),
          OBR.party.getPlayers(),
        ]).then(([playerName, role, players]) => {
          const message = formatRumbleMessage({
            playerName,
            dice: diceResults,
            total,
            advantage,
            presetName,
            notation,
          });

          const gmPlayer = players.find((p) => p.role === "GM");
          const gmObrId =
            role === "GM" ? playerObrId : gmPlayer?.id ?? playerObrId;

          const targets = getRumbleTargets({
            hidden,
            playerObrId,
            gmObrId,
            playerRole: role,
          });

          for (const targetId of targets) {
            OBR.player.setMetadata({
              [RUMBLE_CHAT_KEY]: {
                chatlog: message,
                created: new Date().toISOString(),
                sender: "Dicex",
                targetId,
              },
            });
          }
        });
      }),
    []
  );

  return null;
}
