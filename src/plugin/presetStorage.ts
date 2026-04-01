import OBR from "@owlbear-rodeo/sdk";
import { v4 as uuidv4 } from "uuid";
import { parseNotation } from "../helpers/notationParser";

export interface Preset {
  id: string;
  name: string;
  notation: string;
}

interface PresetData {
  presets: Preset[];
}

const PRESET_KEY_PREFIX = "com.dicex/presets/";

function getKey(playerId: string): string {
  return `${PRESET_KEY_PREFIX}${playerId}`;
}

export async function loadPresets(playerId: string): Promise<Preset[]> {
  const metadata = await OBR.room.getMetadata();
  const data = metadata[getKey(playerId)] as PresetData | undefined;
  return data?.presets ?? [];
}

export async function savePreset(
  playerId: string,
  name: string,
  notation: string
): Promise<void> {
  parseNotation(notation); // Throws NotationError if invalid
  const presets = await loadPresets(playerId);
  presets.push({ id: uuidv4(), name, notation });
  await OBR.room.setMetadata({ [getKey(playerId)]: { presets } });
}

export async function deletePreset(
  playerId: string,
  presetId: string
): Promise<void> {
  const presets = await loadPresets(playerId);
  const filtered = presets.filter((p) => p.id !== presetId);
  await OBR.room.setMetadata({ [getKey(playerId)]: { presets: filtered } });
}

export async function updatePreset(
  playerId: string,
  presetId: string,
  updates: { name?: string; notation?: string }
): Promise<void> {
  if (updates.notation) {
    parseNotation(updates.notation); // Validate
  }
  const presets = await loadPresets(playerId);
  const preset = presets.find((p) => p.id === presetId);
  if (preset) {
    if (updates.name !== undefined) preset.name = updates.name;
    if (updates.notation !== undefined) preset.notation = updates.notation;
  }
  await OBR.room.setMetadata({ [getKey(playerId)]: { presets } });
}
