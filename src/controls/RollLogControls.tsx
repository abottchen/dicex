import { useState, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DownloadIcon from "@mui/icons-material/FileDownloadRounded";
import DownloadClearIcon from "@mui/icons-material/DeleteSweepRounded";
import OBR from "@owlbear-rodeo/sdk";
import { combinePlayerLogs, triggerJsonDownload } from "../plugin/rollLogExport";
import { getPlayerLogs, clearPlayerLogs } from "../plugin/rollLogStorage";

export function RollLogControls() {
  const [isGM, setIsGM] = useState(false);

  useEffect(() => {
    OBR.player.getRole().then((role) => setIsGM(role === "GM"));
  }, []);

  if (!isGM) return null;

  async function handleDownload() {
    const logs = await getPlayerLogs();
    const combined = combinePlayerLogs(logs);
    const date = new Date().toISOString().split("T")[0];
    triggerJsonDownload(combined, `dicex-rolls-${date}.json`);
  }

  async function handleDownloadAndClear() {
    await handleDownload();
    await clearPlayerLogs();
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
