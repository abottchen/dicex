import OBR from "@owlbear-rodeo/sdk";
import {
  INTERNAL_PING_CHANNEL,
  INTERNAL_READY_CHANNEL,
  INTERNAL_ROLL_CHANNEL,
  RollRequest,
} from "./dicePlusProtocol";

const HANDSHAKE_TIMEOUT_MS = 2000;

function makeNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Resolve once an internal-ready reply with a matching nonce arrives, or after the timeout. */
function awaitReady(nonce: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      unsub();
      clearTimeout(timer);
      resolve();
    };

    const unsub = OBR.broadcast.onMessage(INTERNAL_READY_CHANNEL, (event) => {
      const data = event.data as { nonce?: string };
      if (data?.nonce === nonce) finish();
    });

    const timer = setTimeout(finish, timeoutMs);
  });
}

export async function relayRollRequest(payload: RollRequest): Promise<void> {
  await OBR.action.open();

  const nonce = makeNonce();
  const ready = awaitReady(nonce, HANDSHAKE_TIMEOUT_MS);

  await OBR.broadcast.sendMessage(
    INTERNAL_PING_CHANNEL,
    { nonce },
    { destination: "LOCAL" }
  );

  await ready;

  await OBR.broadcast.sendMessage(
    INTERNAL_ROLL_CHANNEL,
    payload,
    { destination: "LOCAL" }
  );
}
