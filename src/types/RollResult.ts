/** A single die result within a completed roll */
export interface DieResult {
  /** Die type: d4, d6, d8, d10, d12, d20, d100 */
  type: string;
  /** The face value rolled */
  value: number;
  /** true if this die was excluded by keep/drop rules */
  dropped?: boolean;
  /** true if this die was spawned by an exploding dice mechanic */
  isExplosion?: boolean;
}

/** A modifier (bonus) entry in a roll result */
export interface ModifierResult {
  type: "mod";
  value: number;
}

/** A single completed roll with all metadata */
export interface RollEntry {
  /** ISO 8601 UTC timestamp */
  timestamp: string;
  /** Original dice notation string (e.g. "2d6+3", "4d6k3") */
  notation: string;
  /** Individual die results */
  dice: (DieResult | ModifierResult)[];
  /** Final calculated total */
  total: number;
  /** Present only for advantage/disadvantage rolls */
  advantage?: "adv" | "dis";
  /** Preset name, if roll originated from a preset */
  preset?: string;
}
