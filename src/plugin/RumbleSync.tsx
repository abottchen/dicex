import { useEffect } from "react";
import { createRumbleSyncSubscription } from "./rumbleSyncSubscription";

export function RumbleSync() {
  useEffect(() => createRumbleSyncSubscription(), []);
  return null;
}
