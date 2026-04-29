import OBR from "@owlbear-rodeo/sdk";
import { v4 as uuidv4 } from "uuid";
import { RollEntry } from "../types/RollResult";

const LOG_KEY_PREFIX = "com.dicex/roll-log/";
const MANIFEST_KEY = "com.dicex/roll-log-manifest";
const SCENE_ID_KEY = "com.dicex/scene-id";

export interface SceneLogManifest {
  sceneName: string;
  playerCount: number;
  rollCount: number;
  sizeBytes: number;
  lastUpdated: string;
}

interface PlayerLog {
  name: string;
  rolls: RollEntry[];
}

/** Read the roll-log manifest from room metadata. */
export async function getManifest(): Promise<Record<string, SceneLogManifest>> {
  const metadata = await OBR.room.getMetadata();
  return (metadata[MANIFEST_KEY] as Record<string, SceneLogManifest>) ?? {};
}

/** Read all player roll logs from the current scene's metadata. */
export async function getPlayerLogs(): Promise<Record<string, PlayerLog>> {
  const metadata = await OBR.scene.getMetadata();
  const result: Record<string, PlayerLog> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (key.startsWith(LOG_KEY_PREFIX)) {
      const playerId = key.slice(LOG_KEY_PREFIX.length);
      result[playerId] = value as PlayerLog;
    }
  }

  return result;
}

/**
 * Append a roll entry to a player's log in the current scene,
 * and update the room-level manifest.
 */
export async function appendRollEntry(
  playerId: string,
  playerName: string,
  entry: RollEntry,
): Promise<void> {
  const sceneId = await ensureSceneId();

  // Read existing player log from scene metadata
  const sceneMetadata = await OBR.scene.getMetadata();
  const logKey = `${LOG_KEY_PREFIX}${playerId}`;
  const existingLog = (sceneMetadata[logKey] as PlayerLog | undefined) ?? {
    name: playerName,
    rolls: [],
  };

  const oldSize = JSON.stringify(existingLog).length;
  const isNewPlayer = existingLog.rolls.length === 0;

  // Append the new entry
  existingLog.name = playerName;
  existingLog.rolls.push(entry);

  const newSize = JSON.stringify(existingLog).length;
  const sizeDelta = newSize - (isNewPlayer ? 0 : oldSize);

  // Write updated player log to scene metadata
  await OBR.scene.setMetadata({ [logKey]: existingLog });

  // Update the room-level manifest
  const roomMetadata = await OBR.room.getMetadata();
  const manifest =
    (roomMetadata[MANIFEST_KEY] as Record<string, SceneLogManifest>) ?? {};

  const existing = manifest[sceneId];

  if (existing) {
    existing.rollCount += 1;
    existing.sizeBytes += sizeDelta;
    existing.lastUpdated = entry.timestamp;
    if (isNewPlayer) {
      existing.playerCount += 1;
    }
  } else {
    // First manifest entry for this scene - get the scene name
    const sceneName = await getSceneName();
    manifest[sceneId] = {
      sceneName,
      playerCount: 1,
      rollCount: 1,
      sizeBytes: newSize,
      lastUpdated: entry.timestamp,
    };
  }

  await OBR.room.setMetadata({ [MANIFEST_KEY]: manifest });
}

/**
 * Clear all player logs from the current scene and remove its manifest entry.
 */
export async function clearPlayerLogs(): Promise<void> {
  const sceneMetadata = await OBR.scene.getMetadata();
  const sceneId = sceneMetadata[SCENE_ID_KEY] as string | undefined;

  // Build an update that sets all log keys to undefined (deletes them)
  const clearUpdate: Record<string, undefined> = {};
  for (const key of Object.keys(sceneMetadata)) {
    if (key.startsWith(LOG_KEY_PREFIX)) {
      clearUpdate[key] = undefined;
    }
  }

  if (Object.keys(clearUpdate).length > 0) {
    await OBR.scene.setMetadata(clearUpdate);
  }

  // Remove this scene from the room manifest
  if (sceneId) {
    const roomMetadata = await OBR.room.getMetadata();
    const manifest =
      (roomMetadata[MANIFEST_KEY] as Record<string, SceneLogManifest>) ?? {};
    delete manifest[sceneId];
    await OBR.room.setMetadata({ [MANIFEST_KEY]: manifest });
  }
}

/** Ensure the current scene has a unique ID, generating one if needed. */
async function ensureSceneId(): Promise<string> {
  const metadata = await OBR.scene.getMetadata();
  const existing = metadata[SCENE_ID_KEY] as string | undefined;
  if (existing) {
    return existing;
  }

  const newId = uuidv4();
  await OBR.scene.setMetadata({ [SCENE_ID_KEY]: newId });
  return newId;
}

/** Get the scene name from the first MAP layer item, or "Unknown Scene". */
async function getSceneName(): Promise<string> {
  const items = await OBR.scene.items.getItems();
  const mapItem = items.find(
    (item: { layer: string; name: string }) => item.layer === "MAP",
  );
  return mapItem?.name || "Unknown Scene";
}
