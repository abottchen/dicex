import { Player } from "@owlbear-rodeo/sdk";
import { useEffect, useMemo, useRef } from "react";
import {
  buildDiceResults,
  ProcessedRollResult,
} from "../helpers/buildDiceResults";
import { NotationComponent } from "../helpers/notationParser";
import { DiceRoll } from "../types/DiceRoll";
import { DiceThrow } from "../types/DiceThrow";
import { DiceTransform } from "../types/DiceTransform";
import { getPluginId } from "./getPluginId";

export function usePlayerDice(player?: Player) {
  const diceRoll = useMemo(() => {
    return player?.metadata[getPluginId("roll")] as DiceRoll | undefined;
  }, [player]);

  const rollThrows = useMemo(() => {
    return player?.metadata[getPluginId("rollThrows")] as
      | Record<string, DiceThrow>
      | undefined;
  }, [player]);

  const rollValues = useMemo(() => {
    return player?.metadata[getPluginId("rollValues")] as
      | Record<string, number | null>
      | undefined;
  }, [player]);

  const rollTransforms = useMemo(() => {
    return player?.metadata[getPluginId("rollTransforms")] as
      | Record<string, DiceTransform | null>
      | undefined;
  }, [player]);

  const rollNotationComponents = useMemo(() => {
    return player?.metadata[getPluginId("rollNotationComponents")] as
      | NotationComponent[]
      | undefined;
  }, [player]);

  const finishedRollTransforms = useMemo(() => {
    if (!rollTransforms) {
      return undefined;
    }
    const values: Record<string, DiceTransform> = {};
    for (const [id, value] of Object.entries(rollTransforms)) {
      if (value !== null) {
        values[id] = value;
      }
    }
    return values;
  }, [rollTransforms]);

  const transformsRef = useRef<Record<string, DiceTransform | null> | null>(
    null
  );
  useEffect(() => {
    transformsRef.current = rollTransforms || null;
  }, [rollTransforms]);

  const finishedRollValues = useMemo(() => {
    if (!rollValues) {
      return undefined;
    }
    const values: Record<string, number> = {};
    for (const [id, value] of Object.entries(rollValues)) {
      if (value !== null) {
        values[id] = value;
      }
    }
    return values;
  }, [rollValues]);

  // Reproduce the roller's result locally from synced inputs. buildDiceResults
  // is the single result authority — its advanced path applies keep/drop/explode
  // (needs the synced notation components), its basic path handles plain rolls,
  // advantage/disadvantage, and D100 via getCombinedDiceValue.
  const result = useMemo<ProcessedRollResult | null>(() => {
    if (diceRoll && finishedRollValues) {
      return buildDiceResults({
        roll: diceRoll,
        rollValues: finishedRollValues,
        activeNotationComponents: rollNotationComponents,
      });
    }
    return null;
  }, [diceRoll, finishedRollValues, rollNotationComponents]);

  const finalValue = result?.total ?? null;

  const finishedRolling = useMemo(() => {
    if (!rollValues) {
      return false;
    }
    const values = Object.values(rollValues);
    if (values.length === 0) {
      return false;
    } else {
      return values.every((value) => value !== null);
    }
  }, [rollValues]);

  return {
    diceRoll,
    rollThrows,
    rollValues,
    rollTransforms,
    transformsRef,
    finishedRollTransforms,
    finalValue,
    result,
    finishedRollValues,
    finishedRolling,
  };
}
