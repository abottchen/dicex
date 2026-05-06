import OBR from "@owlbear-rodeo/sdk";
import { rollFromNotation } from "../helpers/rollFromNotation";
import { useDiceControlsStore } from "../controls/store";
import {
  INTERNAL_PING_CHANNEL,
  INTERNAL_READY_CHANNEL,
  INTERNAL_ROLL_CHANNEL,
  RollRequest,
  rollTargetIsHidden,
} from "./dicePlusProtocol";
import { setPendingRollRequest } from "./dicePlusPendingRequest";

/**
 * Mount the action-sidebar-side Dice+ listeners.
 * Returns an unsubscribe that tears down both channels.
 */
export function createDicePlusInternalRollHandler(): () => void {
  const unsubPing = OBR.broadcast.onMessage(INTERNAL_PING_CHANNEL, (event) => {
    OBR.broadcast.sendMessage(
      INTERNAL_READY_CHANNEL,
      event.data,
      { destination: "LOCAL" }
    );
  });

  const unsubRoll = OBR.broadcast.onMessage(INTERNAL_ROLL_CHANNEL, (event) => {
    const request = event.data as RollRequest;

    setPendingRollRequest({
      rollId: request.rollId,
      source: request.source,
      playerId: request.playerId,
      playerName: request.playerName,
      rollTarget: request.rollTarget,
    });

    // Force the controls hidden flag based on rollTarget before rollFromNotation
    // reads it. We do NOT toggle the user's persisted preference — rollFromNotation
    // captures the current diceHidden from the controls state at call time.
    const controls = useDiceControlsStore.getState();
    const hidden = rollTargetIsHidden(request.rollTarget);
    if (controls.diceHidden !== hidden) {
      // Set directly on the store; toggle would flip from current.
      useDiceControlsStore.setState({ diceHidden: hidden });
    }

    rollFromNotation(request.diceNotation);
  });

  return () => {
    unsubPing();
    unsubRoll();
  };
}
