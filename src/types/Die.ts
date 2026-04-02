import { isPlainObject } from "is-plain-object";

import { DiceStyle } from "./DiceStyle";
import { DiceType } from "./DiceType";

export interface Die {
  id: string;
  style: DiceStyle;
  type: DiceType;
  /** true if this die was spawned by an exploding dice mechanic */
  isExplosion?: boolean;
}

export function isDie(value: any): value is Die {
  return isPlainObject(value) && typeof value.id === "string";
}
