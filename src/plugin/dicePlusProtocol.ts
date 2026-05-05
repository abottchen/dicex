/** Dice+ broadcast channel constants and payload types.
 *  Reference: docs/superpowers/specs/2026-05-05-dice-plus-protocol-design.md
 */

export const DICE_PLUS_IS_READY_CHANNEL = "dice-plus/isReady";
export const DICE_PLUS_ROLL_REQUEST_CHANNEL = "dice-plus/roll-request";

export const INTERNAL_PING_CHANNEL = "rodeo.owlbear.dice/internal-ping";
export const INTERNAL_READY_CHANNEL = "rodeo.owlbear.dice/internal-ready";
export const INTERNAL_ROLL_CHANNEL = "rodeo.owlbear.dice/internal-roll";

export function rollResultChannel(source: string): string {
  return `${source}/roll-result`;
}

export function rollErrorChannel(source: string): string {
  return `${source}/roll-error`;
}

export type RollTarget = "everyone" | "self" | "dm" | "gm_only";

export interface IsReadyRequest {
  requestId: string;
  timestamp: number;
}

export interface IsReadyResponse {
  requestId: string;
  ready: true;
  timestamp: number;
}

export interface RollRequest {
  rollId: string;
  playerId: string;
  playerName: string;
  rollTarget: RollTarget;
  diceNotation: string;
  showResults: boolean;
  timestamp: number;
  /** Requester's extension id; used as the prefix for response channels. */
  source: string;
}

export interface DicePlusDie {
  value: number;
  kept: boolean;
}

export interface DicePlusGroup {
  description: string; // e.g. "2d20kh1"
  diceType: string;    // e.g. "d20"
  dice: DicePlusDie[];
  total: number;       // sum of kept dice only
  isNegative: boolean;
}

export interface DicePlusResult {
  totalValue: number;
  rollSummary: string; // e.g. "3 + 5 + 2 = 10"
  groups: DicePlusGroup[];
}

export interface RollResultMessage {
  rollId: string;
  playerId: string;
  playerName: string;
  rollTarget: RollTarget;
  result: DicePlusResult;
}

export interface RollErrorMessage {
  rollId: string;
  error: string;
  notation: string;
}

/** Map a Dice+ rollTarget onto dicex's hidden flag. */
export function rollTargetIsHidden(target: RollTarget): boolean {
  return target !== "everyone";
}
