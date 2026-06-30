import { useMemo } from "react";

import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Grow from "@mui/material/Grow";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";

import { getCombinedDiceValue } from "../helpers/getCombinedDiceValue";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { getDieValue } from "../helpers/getDieValue";
import { ProcessedRollResult } from "../helpers/buildDiceResults";
import { DiceRoll } from "../types/DiceRoll";
import { Die, isDie } from "../types/Die";
import { Dice, isDice } from "../types/Dice";
import { DicePreview } from "../previews/DicePreview";

export function DiceResults({
  diceRoll,
  rollValues,
  expanded,
  onExpand,
  result,
}: {
  diceRoll: DiceRoll;
  rollValues: Record<string, number>;
  expanded: boolean;
  onExpand: (expand: boolean) => void;
  /**
   * The processed result (total + dropped dice) from buildDiceResults. When
   * present its total is authoritative — it understands keep/drop/explode,
   * which getCombinedDiceValue does not. Falls back to getCombinedDiceValue
   * only when no result is supplied.
   */
  result?: ProcessedRollResult | null;
}) {
  const finalValue = useMemo(() => {
    if (result) return result.total;
    return getCombinedDiceValue(diceRoll, rollValues);
  }, [diceRoll, rollValues, result]);

  return (
    <Stack alignItems="center" maxHeight="calc(100vh - 100px)">
      <Tooltip
        title={expanded ? "Hide Breakdown" : "Show Breakdown"}
        disableInteractive
      >
        <Button
          sx={{ pointerEvents: "all", padding: 0.5, minWidth: "40px" }}
          onClick={() => onExpand(!expanded)}
          color="inherit"
        >
          <Typography variant="h4" color="white">
            {finalValue}
          </Typography>
        </Button>
      </Tooltip>
      <Grow
        in={expanded}
        mountOnEnter
        unmountOnExit
        style={{ transformOrigin: "50% 0 0" }}
      >
        <Stack overflow="auto" sx={{ pointerEvents: "all" }}>
          <DiceResultsExpanded
            diceRoll={diceRoll}
            rollValues={rollValues}
            result={result}
          />
        </Stack>
      </Grow>
    </Stack>
  );
}

function combination(dice: Dice) {
  if (dice.combination === "HIGHEST") {
    return ">";
  } else if (dice.combination === "LOWEST") {
    return "<";
  } else if (dice.combination === "NONE") {
    return ",";
  } else {
    return "+";
  }
}

function sortDice(
  die: Die[],
  rollValues: Record<string, number>,
  combination: "HIGHEST" | "LOWEST" | "SUM" | "NONE" | undefined
) {
  return die.sort((a, b) => {
    const aValue = rollValues[a.id];
    const bValue = rollValues[b.id];
    if (combination === "HIGHEST") {
      return bValue - aValue;
    } else if (combination === "LOWEST") {
      return aValue - bValue;
    } else {
      return 0;
    }
  });
}

function DiceResultsExpanded({
  diceRoll,
  rollValues,
  result,
}: {
  diceRoll: DiceRoll;
  rollValues: Record<string, number>;
  result?: ProcessedRollResult | null;
}) {
  // Keep/drop rolls (droppedIds non-empty) are flat and need a die struck out;
  // the recursive renderer can't express that. Everything else — SUM, nested
  // advantage/disadvantage, D100, pure explode — stays on the proven renderer.
  // No hooks here so the branch can flip (null → result) without breaking the
  // rules of hooks; each child owns its own hooks.
  if (result && result.droppedIds.length > 0) {
    return (
      <KeepDropBreakdown
        diceRoll={diceRoll}
        rollValues={rollValues}
        result={result}
      />
    );
  }
  return <CombinationBreakdown diceRoll={diceRoll} rollValues={rollValues} />;
}

function CombinationBreakdown({
  diceRoll,
  rollValues,
}: {
  diceRoll: DiceRoll;
  rollValues: Record<string, number>;
}) {
  const die = useMemo(
    () =>
      sortDice(diceRoll.dice.filter(isDie), rollValues, diceRoll.combination),
    [diceRoll, rollValues]
  );
  const dice = useMemo(() => diceRoll.dice.filter(isDice), [diceRoll]);

  return (
    <Stack divider={<Divider />} gap={1}>
      <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center">
        {die.map((d, i) => (
          <Stack direction="row" key={d.id} gap={1}>
            <DicePreview diceStyle={d.style} diceType={d.type} size="small" />
            <Typography lineHeight="28px" color="white">
              {rollValues[d.id]}
            </Typography>
            {i < die.length - 1 && (
              <Typography lineHeight="28px" color="white">
                {combination(diceRoll)}
              </Typography>
            )}
          </Stack>
        ))}
        {die.length > 0 && (
          <>
            <Typography lineHeight="28px" color="white">
              =
            </Typography>
            <Typography lineHeight="28px" color="white">
              {getCombinedDiceValue(
                { dice: die, combination: diceRoll.combination },
                rollValues
              )}
            </Typography>
          </>
        )}
      </Stack>
      {dice.map((d, i) => (
        <DiceResultsExpanded key={i} diceRoll={d} rollValues={rollValues} />
      ))}
      {diceRoll.bonus && (
        <Typography textAlign="center" lineHeight="28px" color="white">
          {diceRoll.bonus > 0 && "+"}
          {diceRoll.bonus}
        </Typography>
      )}
    </Stack>
  );
}

function KeepDropBreakdown({
  diceRoll,
  rollValues,
  result,
}: {
  diceRoll: DiceRoll;
  rollValues: Record<string, number>;
  result: ProcessedRollResult;
}) {
  // Draw the real dice (which carry style/type), striking those whose id the
  // result marked dropped. Flatten via getDieFromDice — the same enumeration
  // buildDiceResults used to compute droppedIds, so the strike can't misalign.
  const dice = useMemo(() => getDieFromDice(diceRoll), [diceRoll]);
  const dropped = useMemo(
    () => new Set(result.droppedIds),
    [result.droppedIds]
  );
  const bonus = diceRoll.bonus ?? 0;
  const keptSubtotal = result.total - bonus;

  return (
    <Stack divider={<Divider />} gap={1}>
      <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center">
        {dice.map((d, i) => (
          <Stack direction="row" key={d.id} gap={1}>
            <DicePreview diceStyle={d.style} diceType={d.type} size="small" />
            <Typography
              lineHeight="28px"
              color="white"
              sx={
                dropped.has(d.id)
                  ? { textDecoration: "line-through", opacity: 0.5 }
                  : undefined
              }
            >
              {getDieValue(d.type, rollValues[d.id])}
            </Typography>
            {i < dice.length - 1 && (
              <Typography lineHeight="28px" color="white">
                +
              </Typography>
            )}
          </Stack>
        ))}
        <Typography lineHeight="28px" color="white">
          =
        </Typography>
        <Typography lineHeight="28px" color="white">
          {keptSubtotal}
        </Typography>
      </Stack>
      {bonus !== 0 && (
        <Typography textAlign="center" lineHeight="28px" color="white">
          {bonus > 0 && "+"}
          {bonus}
        </Typography>
      )}
    </Stack>
  );
}
