import OBR from "@owlbear-rodeo/sdk";

const SETTING_KEY_PREFIX = "com.dicex";

function getKey(settingName: string, playerId: string): string {
  return `${SETTING_KEY_PREFIX}/${settingName}/${playerId}`;
}

export async function loadSetting<T>(
  settingName: string,
  playerId: string,
  fallback: T
): Promise<T> {
  const metadata = await OBR.room.getMetadata();
  const value = metadata[getKey(settingName, playerId)];
  return value === undefined ? fallback : (value as T);
}

export async function saveSetting<T>(
  settingName: string,
  playerId: string,
  value: T
): Promise<void> {
  await OBR.room.setMetadata({
    [getKey(settingName, playerId)]: value,
  });
}
