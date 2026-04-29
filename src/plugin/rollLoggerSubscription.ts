import OBR from "@owlbear-rodeo/sdk";
import { useDiceRollStore } from "../dice/store";
import { useDiceControlsStore } from "../controls/store";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { buildDiceResults } from "../helpers/buildDiceResults";
import { buildRollEntry } from "./buildRollEntry";
import { appendRollEntry } from "./rollLogStorage";

export function createRollLoggerSubscription(): () => void {
  let prevFinished = false;
  let prevIds: string[] = [];

  return useDiceRollStore.subscribe((state) => {
    if (!state.roll) {
      prevFinished = false;
      prevIds = [];
      return;
    }

    const ids = getDieFromDice(state.roll).map((die) => die.id);
    if (
      ids.length !== prevIds.length ||
      !ids.every((id, i) => id === prevIds[i])
    ) {
      prevFinished = false;
    }
    prevIds = ids;

    const allFinished = Object.values(state.rollValues).every(
      (v) => v !== null
    );
    if (!allFinished || prevFinished) {
      return;
    }

    // Don't log while explosion waves are still processing
    if (state.explosionWavesActive) {
      return;
    }
    prevFinished = true;

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
    OBR.player.getName().then((playerName) =>
      appendRollEntry(playerId, playerName, entry).catch(() => {
        OBR.notification.show(
          "Dicex: Failed to save roll to log. Your roll result is still valid, but it won't appear in the session log.",
          "ERROR",
        );
      }),
    );
  });
}
