import { KeyboardEvent, useMemo } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

import { useDiceControlsStore } from "./store";
import { NotationError, parseNotation } from "../helpers/notationParser";
import { rollFromNotation } from "../helpers/rollFromNotation";

export function NotationInput() {
  const value = useDiceControlsStore((s) => s.notationInputText);
  const setValue = useDiceControlsStore((s) => s.setNotationInputText);

  const error = useMemo(() => {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    try {
      parseNotation(trimmed);
      return undefined;
    } catch (e) {
      return e instanceof NotationError ? e.message : "Invalid notation";
    }
  }, [value]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed === "" || error !== undefined) return;
    rollFromNotation(trimmed);
  }

  return (
    <Box
      component="div"
      sx={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: "75%",
        pointerEvents: "all",
      }}
    >
      <TextField
        size="small"
        fullWidth
        placeholder="Type notation, press Enter (e.g. 2d6+3)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        error={!!error}
        helperText={error}
        InputProps={{
          sx: {
            backgroundColor: "rgba(0,0,0,0.6)",
            color: "white",
          },
        }}
      />
    </Box>
  );
}
