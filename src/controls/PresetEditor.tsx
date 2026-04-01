import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import OBR from "@owlbear-rodeo/sdk";

import {
  loadPresets,
  deletePreset,
  updatePreset,
  Preset,
} from "../plugin/presetStorage";
import { parseNotation, NotationError } from "../helpers/notationParser";

interface PresetEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface EditablePreset extends Preset {
  notationError?: string;
}

export function PresetEditor({ open, onClose, onSave }: PresetEditorProps) {
  const [presets, setPresets] = useState<EditablePreset[]>([]);

  useEffect(() => {
    if (open) {
      loadPresets(OBR.player.id).then((loaded) =>
        setPresets(loaded.map((p) => ({ ...p })))
      );
    }
  }, [open]);

  function validateNotation(notation: string): string | undefined {
    try {
      parseNotation(notation);
      return undefined;
    } catch (e) {
      return e instanceof NotationError ? e.message : "Invalid notation";
    }
  }

  function handleNameChange(id: string, name: string) {
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p))
    );
  }

  function handleNotationChange(id: string, notation: string) {
    const notationError = validateNotation(notation);
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, notation, notationError } : p))
    );
  }

  function handleDelete(id: string) {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }

  const hasErrors = presets.some((p) => p.notationError);

  async function handleSave() {
    if (hasErrors) return;

    const playerId = OBR.player.id;
    const currentPresets = await loadPresets(playerId);

    // Find deleted presets
    const editedIds = new Set(presets.map((p) => p.id));
    for (const current of currentPresets) {
      if (!editedIds.has(current.id)) {
        await deletePreset(playerId, current.id);
      }
    }

    // Update remaining presets
    for (const preset of presets) {
      await updatePreset(playerId, preset.id, {
        name: preset.name,
        notation: preset.notation,
      });
    }

    onSave();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Presets</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {presets.map((preset) => (
            <Stack key={preset.id} direction="row" spacing={1} alignItems="flex-start">
              <TextField
                label="Name"
                value={preset.name}
                onChange={(e) => handleNameChange(preset.id, e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Notation"
                value={preset.notation}
                onChange={(e) =>
                  handleNotationChange(preset.id, e.target.value)
                }
                error={!!preset.notationError}
                helperText={preset.notationError}
                size="small"
                sx={{ flex: 1 }}
              />
              <IconButton onClick={() => handleDelete(preset.id)} size="small">
                <DeleteIcon />
              </IconButton>
            </Stack>
          ))}
          {presets.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No presets to edit
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={hasErrors}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
