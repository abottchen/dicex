import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import TuneIcon from "@mui/icons-material/TuneRounded";
import OBR from "@owlbear-rodeo/sdk";

import { useDiceControlsStore } from "./store";
import { useDiceRollStore } from "../dice/store";
import { loadPresets, Preset } from "../plugin/presetStorage";
import { parseNotation, isModifierComponent } from "../helpers/notationParser";
import { PresetEditor } from "./PresetEditor";

export function PresetPicker() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);

  const changeDieCount = useDiceControlsStore((s) => s.changeDieCount);
  const setDiceBonus = useDiceControlsStore((s) => s.setDiceBonus);
  const resetDiceCounts = useDiceControlsStore((s) => s.resetDiceCounts);
  const setActivePresetName = useDiceControlsStore((s) => s.setActivePresetName);
  const diceSet = useDiceControlsStore((s) => s.diceSet);
  const clearRoll = useDiceRollStore((s) => s.clearRoll);

  async function refreshPresets() {
    const loaded = await loadPresets(OBR.player.id);
    setPresets(loaded);
  }

  function handleOpen(event: React.MouseEvent<HTMLElement>) {
    refreshPresets();
    setAnchorEl(event.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  function handleSelectPreset(preset: Preset) {
    handleClose();

    try {
      const components = parseNotation(preset.notation);

      // Clear existing roll from tray and reset counts
      clearRoll();
      resetDiceCounts();
      setDiceBonus(0);
      setActivePresetName(preset.name);

      for (const component of components) {
        if (isModifierComponent(component)) {
          setDiceBonus(component.modifier);
        } else {
          // Find matching die in current set by type
          const typeStr = `D${component.sides}`;
          const die = diceSet.dice.find((d) => d.type === typeStr);
          if (die) {
            changeDieCount(die.id, component.count);
          }
        }
      }
    } catch {
      // Invalid notation — skip
    }
  }

  return (
    <>
      <Tooltip title="Presets" placement="top" disableInteractive>
        <IconButton onClick={handleOpen}>
          <TuneIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        PaperProps={{
          sx: { maxHeight: 300, overflowY: "auto" },
        }}
      >
        {presets.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No presets saved
            </Typography>
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
            handleClose();
            setEditorOpen(true);
          }}
        >
          <Typography variant="body2">Edit Presets</Typography>
        </MenuItem>
      </Menu>
      <PresetEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={refreshPresets}
      />
    </>
  );
}
