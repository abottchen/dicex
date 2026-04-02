import { useEffect } from "react";
import { createRollLoggerSubscription } from "./rollLoggerSubscription";

export function RollLogger() {
  useEffect(() => createRollLoggerSubscription(), []);
  return null;
}
