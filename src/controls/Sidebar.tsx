import { useEffect } from "react";
import SimpleBar from "simplebar-react";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import OBR from "@owlbear-rodeo/sdk";

import { DiceSetPicker } from "./DiceSetPicker";
import { DicePicker } from "./DicePicker";
import { DiceExtras } from "./DiceExtras";
import { DiceHidden } from "./DiceHidden";
import { DiceHistory } from "./DiceHistory";
import { useDiceControlsStore } from "./store";

import { ToolsMenu } from "./ToolsMenu";

import { PluginGate } from "../plugin/PluginGate";
import { DiceRollSync } from "../plugin/DiceRollSync";
import { RumbleSync } from "../plugin/RumbleSync";
import { RollLogger } from "../plugin/RollLogger";
import { PartyTrays } from "../plugin/PartyTrays";
import { ResizeObserver as PluginResizeObserver } from "../plugin/ResizeObserver";

function HiddenInitializer() {
  const initializeHidden = useDiceControlsStore((s) => s.initializeHidden);
  useEffect(() => {
    OBR.player.getRole().then((role) => initializeHidden(role));
  }, [initializeHidden]);
  return null;
}

export function Sidebar() {
  return (
    <SimpleBar
      style={{
        maxHeight: "100vh",
        width: "60px",
        minWidth: "60px",
        overflowY: "auto",
      }}
    >
      <Stack p={1} gap={1} alignItems="center">
        <DiceSetPicker />
        <Divider flexItem sx={{ mx: 1 }} />
        <DicePicker />
        <Divider flexItem sx={{ mx: 1 }} />
        <DiceHidden />
        <DiceExtras />
        <DiceHistory />
        <ToolsMenu />
        <PluginGate>
          <HiddenInitializer />
          <Divider flexItem sx={{ mx: 1 }} />
          <DiceRollSync />
          <RumbleSync />
          <RollLogger />
          <PartyTrays />
          <PluginResizeObserver />
        </PluginGate>
      </Stack>
    </SimpleBar>
  );
}
