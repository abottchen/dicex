import OBR from "@owlbear-rodeo/sdk";
import { parseNotation, NotationError } from "../helpers/notationParser";
import {
  DICE_PLUS_IS_READY_CHANNEL,
  DICE_PLUS_ROLL_REQUEST_CHANNEL,
  IsReadyRequest,
  IsReadyResponse,
  RollRequest,
  RollErrorMessage,
  rollErrorChannel,
} from "./dicePlusProtocol";
import { relayRollRequest } from "./dicePlusBackgroundCoordinator";

/** Mount the background-side Dice+ listeners. Returns an unsubscribe. */
export function mountDicePlusBackgroundListeners(): () => void {
  const unsubReady = OBR.broadcast.onMessage(
    DICE_PLUS_IS_READY_CHANNEL,
    (event) => {
      const req = event.data as IsReadyRequest;
      // Ignore our own response (which goes out on the same channel).
      if ((event.data as Partial<IsReadyResponse>).ready === true) return;

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
      const payload = event.data as RollRequest;

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

      relayRollRequest(payload);
    }
  );

  return () => {
    unsubReady();
    unsubRoll();
  };
}
