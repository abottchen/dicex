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

// Diagnostic log for inspecting what external extensions broadcast on the
// public roll-request channel. Each connected dicex client writes its own
// last-N entries to its own player metadata so the GM can read everyone's
// view via OBR.party.getPlayers(). Remove once Forge integration is stable.
const DEBUG_LOG_KEY = "com.dicex/debug/last-roll-requests";
const MAX_DEBUG_ENTRIES = 20;

type DebugEntry = {
  at: string;
  connectionId: string;
  localPlayerId: string;
  data: unknown;
  result: "relayed" | "ignored: invalid shape" | "ignored: not addressed";
};

/** Mount the background-side Dice+ listeners. Returns an unsubscribe. */
export function mountDicePlusBackgroundListeners(): () => void {
  const debugLog: DebugEntry[] = [];

  const recordDebug = (entry: DebugEntry) => {
    debugLog.unshift(entry);
    if (debugLog.length > MAX_DEBUG_ENTRIES) {
      debugLog.length = MAX_DEBUG_ENTRIES;
    }
    OBR.player.setMetadata({ [DEBUG_LOG_KEY]: debugLog });
  };

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
      const at = new Date().toISOString();
      const localPlayerId = OBR.player.id;

      if (!isRollRequest(event.data)) {
        recordDebug({
          at,
          connectionId: event.connectionId,
          localPlayerId,
          data: event.data,
          result: "ignored: invalid shape",
        });
        return;
      }
      const payload = event.data;

      // Only the addressed player should react. Without this gate every
      // connected dicex client relays the roll into its own action sidebar,
      // leaving stuck rolls on inactive tabs (rollValues frozen at null).
      if (payload.playerId !== localPlayerId) {
        recordDebug({
          at,
          connectionId: event.connectionId,
          localPlayerId,
          data: payload,
          result: "ignored: not addressed",
        });
        return;
      }

      recordDebug({
        at,
        connectionId: event.connectionId,
        localPlayerId,
        data: payload,
        result: "relayed",
      });

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
