import { useState, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DownloadIcon from "@mui/icons-material/FileDownloadRounded";
import DownloadClearIcon from "@mui/icons-material/DeleteSweepRounded";
import OBR from "@owlbear-rodeo/sdk";
import { combinePlayerLogs, triggerJsonDownload } from "../plugin/rollLogExport";

const LOG_KEY_PREFIX = "com.dicex/roll-log/";

export function RollLogControls() {
  const [isGM, setIsGM] = useState(false);

  useEffect(() => {
    OBR.player.getRole().then((role) => setIsGM(role === "GM"));
  }, []);

  if (!isGM) return null;

  async function getPlayerLogs() {
    const metadata = await OBR.room.getMetadata();
    const logs: Record<string, { name: string; rolls: unknown[] }> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (key.startsWith(LOG_KEY_PREFIX)) {
        const playerId = key.slice(LOG_KEY_PREFIX.length);
        logs[playerId] = value as { name: string; rolls: unknown[] };
      }
    }
    return logs;
  }

  async function handleDownload() {
    const logs = await getPlayerLogs();
    const combined = combinePlayerLogs(logs);
    const date = new Date().toISOString().split("T")[0];
    triggerJsonDownload(combined, `dicex-rolls-${date}.json`);
  }

  async function handleDownloadAndClear() {
    await handleDownload();
    const metadata = await OBR.room.getMetadata();
    const clearObj: Record<string, undefined> = {};
    for (const key of Object.keys(metadata)) {
      if (key.startsWith(LOG_KEY_PREFIX)) {
        clearObj[key] = undefined;
      }
    }
    await OBR.room.setMetadata(clearObj);
  }

  return (
    <>
      <Tooltip title="Download Roll Log" placement="top" disableInteractive>
        <IconButton onClick={handleDownload}>
          <DownloadIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Download & Clear Roll Log" placement="top" disableInteractive>
        <IconButton onClick={handleDownloadAndClear}>
          <DownloadClearIcon />
        </IconButton>
      </Tooltip>
    </>
  );
}
