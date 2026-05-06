import { useEffect } from "react";
import { createDicePlusInternalRollHandler } from "./dicePlusInternalRollHandler";
import { createDicePlusResultReporter } from "./dicePlusResultReporter";

export function DicePlusHandler() {
  useEffect(() => {
    const unsubHandler = createDicePlusInternalRollHandler();
    const unsubReporter = createDicePlusResultReporter();
    return () => {
      unsubHandler();
      unsubReporter();
    };
  }, []);
  return null;
}
