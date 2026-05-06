import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "./plugin/getPluginId";
import { mountDicePlusBackgroundListeners } from "./plugin/dicePlusBackgroundListeners";

OBR.onReady(() => {
  OBR.popover.open({
    id: getPluginId("popover"),
    url: `${import.meta.env.BASE_URL}popover.html`,
    width: 0,
    height: 0,
    anchorOrigin: { horizontal: "RIGHT", vertical: "BOTTOM" },
    transformOrigin: { horizontal: "RIGHT", vertical: "BOTTOM" },
    disableClickAway: true,
    hidePaper: true,
    marginThreshold: 0,
  });

  mountDicePlusBackgroundListeners();
});
