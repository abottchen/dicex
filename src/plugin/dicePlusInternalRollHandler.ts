import OBR from "@owlbear-rodeo/sdk";
import { rollFromNotation } from "../helpers/rollFromNotation";
import { useDiceControlsStore } from "../controls/store";
import {
  INTERNAL_PING_CHANNEL,
  INTERNAL_READY_CHANNEL,
  INTERNAL_ROLL_CHANNEL,
  RollRequest,
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

    // Temporary: force every Dice+ roll to hidden regardless of rollTarget.
    // Upstream is sending rollTarget="everyone" for rolls that should be private,
    // so until that's fixed we default Dice+ rolls to GM-only.
    const controls = useDiceControlsStore.getState();
    if (!controls.diceHidden) {
      useDiceControlsStore.setState({ diceHidden: true });
    }

    rollFromNotation(request.diceNotation);
  });

  return () => {
    unsubPing();
    unsubRoll();
  };
}
