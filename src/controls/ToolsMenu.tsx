import { useState, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import BuildIcon from "@mui/icons-material/BuildRounded";
import FairnessIcon from "@mui/icons-material/BalanceRounded";
import TuneIcon from "@mui/icons-material/TuneRounded";
import DownloadIcon from "@mui/icons-material/FileDownloadRounded";
import DownloadClearIcon from "@mui/icons-material/DeleteSweepRounded";
import Divider from "@mui/material/Divider";
import OBR from "@owlbear-rodeo/sdk";

import { useDiceControlsStore } from "./store";
import { useDiceRollStore } from "../dice/store";
import { PresetEditor } from "./PresetEditor";
import { loadPresets, Preset } from "../plugin/presetStorage";
import { parseNotation, isModifierComponent } from "../helpers/notationParser";
import { combinePlayerLogs, triggerJsonDownload } from "../plugin/rollLogExport";

const LOG_KEY_PREFIX = "com.dicex/roll-log/";

export function ToolsMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [presetAnchorEl, setPresetAnchorEl] = useState<null | HTMLElement>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isGM, setIsGM] = useState(false);
  const [isPlugin, setIsPlugin] = useState(false);

  const toggleFairnessTester = useDiceControlsStore(
    (state) => state.toggleFairnessTester
  );
  const changeDieCount = useDiceControlsStore((s) => s.changeDieCount);
  const setDiceBonus = useDiceControlsStore((s) => s.setDiceBonus);
  const resetDiceCounts = useDiceControlsStore((s) => s.resetDiceCounts);
  const setActivePresetName = useDiceControlsStore((s) => s.setActivePresetName);
  const diceSet = useDiceControlsStore((s) => s.diceSet);
  const clearRoll = useDiceRollStore((s) => s.clearRoll);

  useEffect(() => {
    if (OBR.isAvailable) {
      OBR.onReady(() => {
        setIsPlugin(true);
        OBR.player.getRole().then((role) => setIsGM(role === "GM"));
      });
    }
  }, []);

  function handleOpen(event: React.MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
    setPresetAnchorEl(null);
  }

  function handlePresetsOpen(event: React.MouseEvent<HTMLElement>) {
    if (isPlugin) {
      loadPresets(OBR.player.id).then(setPresets);
    }
    setPresetAnchorEl(event.currentTarget);
  }

  function handlePresetsClose() {
    setPresetAnchorEl(null);
  }

  function handleSelectPreset(preset: Preset) {
    handlePresetsClose();
    handleClose();
    try {
      const components = parseNotation(preset.notation);
      clearRoll();
      resetDiceCounts();
      setDiceBonus(0);
      setActivePresetName(preset.name);
      for (const component of components) {
        if (isModifierComponent(component)) {
          setDiceBonus(component.modifier);
        } else {
          const typeStr = `D${component.sides}`;
          const die = diceSet.dice.find((d) => d.type === typeStr);
          if (die) {
            changeDieCount(die.id, component.count);
          }
        }
      }
    } catch {
      // Invalid notation
    }
  }

  async function getPlayerLogs() {
    const metadata = await OBR.room.getMetadata();
    const logs: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (key.startsWith(LOG_KEY_PREFIX)) {
        const playerId = key.slice(LOG_KEY_PREFIX.length);
        logs[playerId] = value;
      }
    }
    return logs;
  }

  async function handleDownload() {
    handleClose();
    const logs = await getPlayerLogs();
    const combined = combinePlayerLogs(logs);
    const date = new Date().toISOString().split("T")[0];
    triggerJsonDownload(combined, `dicex-rolls-${date}.json`);
  }

  async function handleDownloadAndClear() {
    handleClose();
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
      <Tooltip title="Tools" placement="top" disableInteractive>
        <IconButton onClick={handleOpen}>
          <BuildIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <MenuItem
          onClick={() => {
            handleClose();
            toggleFairnessTester();
          }}
        >
          <ListItemIcon>
            <FairnessIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Fairness</ListItemText>
        </MenuItem>
        {isPlugin && (
          <MenuItem onClick={handlePresetsOpen}>
            <ListItemIcon>
              <TuneIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Presets</ListItemText>
          </MenuItem>
        )}
        {isPlugin && isGM && <Divider />}
        {isPlugin && isGM && (
          <MenuItem onClick={handleDownload}>
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Download Rolls</ListItemText>
          </MenuItem>
        )}
        {isPlugin && isGM && (
          <MenuItem onClick={handleDownloadAndClear}>
            <ListItemIcon>
              <DownloadClearIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Download & Clear</ListItemText>
          </MenuItem>
        )}
      </Menu>
      <Menu
        anchorEl={presetAnchorEl}
        open={Boolean(presetAnchorEl)}
        onClose={handlePresetsClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        {presets.length === 0 && (
          <MenuItem disabled>
            <ListItemText>No presets saved</ListItemText>
          </MenuItem>
        )}
        {presets.map((preset) => (
          <MenuItem key={preset.id} onClick={() => handleSelectPreset(preset)}>
            <ListItemText primary={preset.name} secondary={preset.notation} />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            handlePresetsClose();
            handleClose();
            setEditorOpen(true);
          }}
        >
          <ListItemText>Edit Presets</ListItemText>
        </MenuItem>
      </Menu>
      {isPlugin && (
        <PresetEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          onSave={() => {}}
        />
      )}
    </>
  );
}
