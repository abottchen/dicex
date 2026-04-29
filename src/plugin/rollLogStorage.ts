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
 *
 * Each player writes to their own key in scene metadata, so concurrent
 * rolls from different players don't conflict (OBR merges by key).
 * The manifest is recomputed from scene data rather than incremented,
 * so even if two manifest writes race, values self-heal on the next roll.
 */
export async function appendRollEntry(
  playerId: string,
  playerName: string,
  entry: RollEntry,
): Promise<void> {
  const sceneId = await ensureSceneId();

  const sceneMetadata = await OBR.scene.getMetadata();
  const logKey = `${LOG_KEY_PREFIX}${playerId}`;
  const existingLog = (sceneMetadata[logKey] as PlayerLog | undefined) ?? {
    name: playerName,
    rolls: [],
  };

  existingLog.name = playerName;
  existingLog.rolls.push(entry);

  await OBR.scene.setMetadata({ [logKey]: existingLog });

  await updateManifest(sceneId, entry.timestamp);
}

/**
 * Clear all player logs from the current scene and remove its manifest entry.
 */
export async function clearPlayerLogs(): Promise<void> {
  const sceneMetadata = await OBR.scene.getMetadata();
  const sceneId = sceneMetadata[SCENE_ID_KEY] as string | undefined;

  const clearUpdate: Record<string, undefined> = {};
  for (const key of Object.keys(sceneMetadata)) {
    if (key.startsWith(LOG_KEY_PREFIX)) {
      clearUpdate[key] = undefined;
    }
  }

  if (Object.keys(clearUpdate).length > 0) {
    await OBR.scene.setMetadata(clearUpdate);
  }

  if (sceneId) {
    const roomMetadata = await OBR.room.getMetadata();
    const manifest =
      (roomMetadata[MANIFEST_KEY] as Record<string, SceneLogManifest>) ?? {};
    delete manifest[sceneId];
    await OBR.room.setMetadata({ [MANIFEST_KEY]: manifest });
  }
}

/**
 * Recompute the manifest entry for this scene from actual scene data.
 * This avoids incremental counter drift when multiple players write
 * concurrently from separate browser tabs.
 */
async function updateManifest(sceneId: string, timestamp: string): Promise<void> {
  const logs = await getPlayerLogs();
  const playerIds = Object.keys(logs);

  let rollCount = 0;
  let sizeBytes = 0;
  for (const log of Object.values(logs)) {
    rollCount += log.rolls.length;
    sizeBytes += JSON.stringify(log).length;
  }

  const roomMetadata = await OBR.room.getMetadata();
  const manifest =
    (roomMetadata[MANIFEST_KEY] as Record<string, SceneLogManifest>) ?? {};

  const sceneName = manifest[sceneId]?.sceneName ?? await getSceneName();

  manifest[sceneId] = {
    sceneName,
    playerCount: playerIds.length,
    rollCount,
    sizeBytes,
    lastUpdated: timestamp,
  };

  await OBR.room.setMetadata({ [MANIFEST_KEY]: manifest });
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

async function getSceneName(): Promise<string> {
  const items = await OBR.scene.items.getItems();
  const mapItem = items.find(
    (item: { layer: string; type: string }) =>
      item.layer === "MAP" && item.type === "IMAGE",
  );
  return mapItem?.name || "Unknown Scene";
}
