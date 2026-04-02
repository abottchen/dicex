import OBR from "@owlbear-rodeo/sdk";
import { useDiceRollStore } from "../dice/store";
import { useDiceControlsStore } from "../controls/store";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { buildDiceResults } from "../helpers/buildDiceResults";
import { formatRumbleMessage } from "./formatRumbleMessage";
import { getRumbleTargets } from "./getRumbleTargets";

const RUMBLE_CHAT_KEY = "com.battle-system.friends/metadata_chatlog";

export function createRumbleSyncSubscription(): () => void {
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

    const hidden = roll.hidden ?? false;
    const playerObrId = OBR.player.id;

    Promise.all([
      OBR.player.getName(),
      OBR.player.getRole(),
      OBR.party.getPlayers(),
    ]).then(([playerName, role, players]) => {
      const message = formatRumbleMessage({
        playerName,
        dice: result.dice,
        total: result.total,
        advantage: result.advantage,
        presetName: result.presetName,
        notation: result.notation,
        hidden,
      });

      const gmPlayer = players.find((p: any) => p.role === "GM");
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
  });
}
