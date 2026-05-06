import OBR from "@owlbear-rodeo/sdk";
import { parseNotation, NotationError } from "../helpers/notationParser";
import {
  DICE_PLUS_IS_READY_CHANNEL,
  DICE_PLUS_ROLL_REQUEST_CHANNEL,
  IsReadyResponse,
  RollErrorMessage,
  isIsReadyRequest,
  isRollRequest,
  rollErrorChannel,
} from "./dicePlusProtocol";
import { relayRollRequest } from "./dicePlusBackgroundCoordinator";

/** Mount the background-side Dice+ listeners. Returns an unsubscribe. */
export function mountDicePlusBackgroundListeners(): () => void {
  const unsubReady = OBR.broadcast.onMessage(
    DICE_PLUS_IS_READY_CHANNEL,
    (event) => {
      if (!isIsReadyRequest(event.data)) return;
      const req = event.data;

      const response: IsReadyResponse = {
        requestId: req.requestId,
        ready: true,
        timestamp: Date.now(),
      };
      OBR.broadcast.sendMessage(
        DICE_PLUS_IS_READY_CHANNEL,
        response,
        { destination: "LOCAL" }
      );
    }
  );

  const unsubRoll = OBR.broadcast.onMessage(
    DICE_PLUS_ROLL_REQUEST_CHANNEL,
    (event) => {
      if (!isRollRequest(event.data)) return;
      const payload = event.data;

      // Only the addressed player should react. Without this gate every
      // connected dicex client relays the roll into its own action sidebar,
      // leaving stuck rolls on inactive tabs (rollValues frozen at null).
      if (payload.playerId !== OBR.player.id) return;

      try {
        parseNotation(payload.diceNotation);
      } catch (e) {
        const message =
          e instanceof NotationError ? e.message : "Failed to parse notation";
        const error: RollErrorMessage = {
          rollId: payload.rollId,
          error: message,
          notation: payload.diceNotation,
        };
        OBR.broadcast.sendMessage(
          rollErrorChannel(payload.source),
          error,
          { destination: "LOCAL" }
        );
        return;
      }

      relayRollRequest(payload).catch((e) => {
        const message = e instanceof Error ? e.message : "Internal relay failure";
        const error: RollErrorMessage = {
          rollId: payload.rollId,
          error: message,
          notation: payload.diceNotation,
        };
        OBR.broadcast.sendMessage(
          rollErrorChannel(payload.source),
          error,
          { destination: "LOCAL" }
        );
      });
    }
  );

  return () => {
    unsubReady();
    unsubRoll();
  };
}
