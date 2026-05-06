import { RollRequest } from "./dicePlusProtocol";

/** Subset of the Dice+ roll request we need to route the response. */
export type PendingRollRequest = Pick<
  RollRequest,
  "rollId" | "source" | "playerId" | "playerName" | "rollTarget"
>;

let pending: PendingRollRequest | null = null;

export function setPendingRollRequest(req: PendingRollRequest): void {
  pending = req;
}

export function getPendingRollRequest(): PendingRollRequest | null {
  return pending;
}

export function clearPendingRollRequest(): void {
  pending = null;
}
