interface GetRumbleTargetsInput {
  hidden: boolean;
  playerObrId: string;
  gmObrId: string;
  playerRole: string;
}

export function getRumbleTargets(input: GetRumbleTargetsInput): string[] {
  const { hidden, playerObrId, gmObrId } = input;
  if (!hidden) {
    return ["0000"];
  }
  const targets = [playerObrId];
  if (gmObrId !== playerObrId) {
    targets.push(gmObrId);
  }
  return targets;
}
