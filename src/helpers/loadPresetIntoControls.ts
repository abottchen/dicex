import { useDiceControlsStore } from "../controls/store";
import { resolveNotationAgainstSet } from "./resolveNotationAgainstSet";

export function loadPresetIntoControls(notation: string, name: string) {
  const store = useDiceControlsStore.getState();
  const { counts, bonus, components } = resolveNotationAgainstSet(
    notation,
    store.diceSet
  );

  store.resetDiceCounts();
  store.setDiceBonus(bonus);
  store.setActivePresetName(name);
  store.setActiveNotationComponents(components);

  for (const [dieId, count] of Object.entries(counts)) {
    if (count > 0) {
      store.changeDieCount(dieId, count);
    }
  }
}
