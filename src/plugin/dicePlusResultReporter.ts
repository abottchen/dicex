import OBR from "@owlbear-rodeo/sdk";
import { useDiceRollStore } from "../dice/store";
import { useDiceControlsStore } from "../controls/store";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { buildDiceResults } from "../helpers/buildDiceResults";
import { buildDicePlusResult } from "./dicePlusResultBuilder";
import {
  getPendingRollRequest,
  clearPendingRollRequest,
} from "./dicePlusPendingRequest";
import {
  rollResultChannel,
  RollResultMessage,
} from "./dicePlusProtocol";

export function createDicePlusResultReporter(): () => void {
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
    if (!allFinished || prevFinished) return;
    if (state.explosionWavesActive) return;

    const pending = getPendingRollRequest();
    if (!pending) return;

    prevFinished = true;

    const roll = state.roll;
    const values = state.rollValues as Record<string, number>;
    const controls = useDiceControlsStore.getState();
    const processed = buildDiceResults({
      roll,
      rollValues: values,
      activeNotation: controls.activeNotation,
      activePresetName: controls.activePresetName,
      activeNotationComponents: controls.activeNotationComponents,
    });

    const dicePlus = buildDicePlusResult(
      processed,
      controls.activeNotationComponents ?? []
    );

    const message: RollResultMessage = {
      rollId: pending.rollId,
      playerId: pending.playerId,
      playerName: pending.playerName,
      rollTarget: pending.rollTarget,
      result: dicePlus,
    };

    OBR.broadcast.sendMessage(
      rollResultChannel(pending.source),
      message,
      { destination: "LOCAL" }
    );

    clearPendingRollRequest();
  });
}
