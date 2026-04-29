import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import { SceneLogManifest } from "../plugin/rollLogStorage";

const MAX_BYTES = 65536; // 64 KB

interface StorageStatusDialogProps {
  open: boolean;
  onClose: () => void;
  manifest: Record<string, SceneLogManifest>;
}

function getStatusColor(sizeBytes: number): "success" | "warning" | "error" {
  const percent = sizeBytes / MAX_BYTES;
  if (percent >= 0.8) return "error";
  if (percent >= 0.5) return "warning";
  return "success";
}

export function StorageStatusDialog({ open, onClose, manifest }: StorageStatusDialogProps) {
  const entries = Object.entries(manifest);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Roll Log Storage</DialogTitle>
      <DialogContent>
        {entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No roll data stored on any scene.
          </Typography>
        ) : (
          entries.map(([sceneId, entry]) => {
            const percent = Math.round((entry.sizeBytes / MAX_BYTES) * 100);
            const sizeKB = (entry.sizeBytes / 1024).toFixed(1);
            const color = getStatusColor(entry.sizeBytes);
            return (
              <Box key={sceneId} component="div" sx={{ mb: 2 }}>
                <Box component="div" sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="body2" fontWeight="bold">
                    {entry.sceneName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {entry.rollCount} rolls &middot; {sizeKB} KB
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(percent, 100)}
                  color={color}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {percent}% of 64 KB
                </Typography>
              </Box>
            );
          })
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
