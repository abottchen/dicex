import { useDiceControlsStore } from "../controls/store";
import { parseNotation, isModifierComponent } from "./notationParser";

export function loadPresetIntoControls(notation: string, name: string) {
  const components = parseNotation(notation);
  const store = useDiceControlsStore.getState();
  store.resetDiceCounts();
  store.setDiceBonus(0);
  store.setActivePresetName(name);
  store.setActiveNotationComponents(components);

  for (const component of components) {
    if (isModifierComponent(component)) {
      store.setDiceBonus(component.modifier);
    } else {
      const typeStr = `D${component.sides}`;
      const die = store.diceSet.dice.find((d) => d.type === typeStr);
      if (die) {
        store.changeDieCount(die.id, component.count);
      }
    }
  }
}
