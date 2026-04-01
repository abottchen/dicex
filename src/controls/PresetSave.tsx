import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorderRounded";
import OBR from "@owlbear-rodeo/sdk";

import { useDiceControlsStore } from "./store";
import { useDiceRollStore } from "../dice/store";
import { serializeNotation } from "../helpers/notationSerializer";
import { savePreset, loadPresets, Preset } from "../plugin/presetStorage";

export function PresetSave() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [existingPresets, setExistingPresets] = useState<Preset[]>([]);

  const diceCounts = useDiceControlsStore((state) => state.diceCounts);
  const diceById = useDiceControlsStore((state) => state.diceById);
  const diceBonus = useDiceControlsStore((state) => state.diceBonus);
  const roll = useDiceRollStore((state) => state.roll);

  // Build notation from current dice selection
  const diceCountsByType: Record<string, number> = {};
  for (const [id, count] of Object.entries(diceCounts)) {
    if (count > 0) {
      const die = diceById[id];
      if (die) {
        const key = die.type.toLowerCase();
        diceCountsByType[key] = (diceCountsByType[key] || 0) + count;
      }
    }
  }
  const notation = serializeNotation(diceCountsByType, diceBonus);
  const hasDiceSelected = Object.values(diceCounts).some((c) => c > 0);

  // Only enabled when dice are selected but not yet rolled
  const enabled = hasDiceSelected && !roll;

  async function handleOpen() {
    const presets = await loadPresets(OBR.player.id);
    setExistingPresets(presets);
    setName("");
    setOpen(true);
  }

  const setActivePresetName = useDiceControlsStore(
    (state) => state.setActivePresetName
  );

  async function handleSave() {
    if (!name.trim()) return;
    await savePreset(OBR.player.id, name.trim(), notation);
    setActivePresetName(name.trim());
    setOpen(false);
  }

  return (
    <>
      <Tooltip title="Save as Preset" placement="top" disableInteractive>
        <span>
          <IconButton onClick={handleOpen} disabled={!enabled} size="small">
            <BookmarkBorderIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Save Preset</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {notation}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Preset Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            size="small"
          />
          {existingPresets.length > 0 && (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 2, display: "block" }}
              >
                Existing Presets
              </Typography>
              <List dense>
                {existingPresets.map((p) => (
                  <ListItem key={p.id}>
                    <ListItemText primary={p.name} secondary={p.notation} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
