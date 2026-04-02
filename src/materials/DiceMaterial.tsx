import * as THREE from "three";
import { DiceStyle } from "../types/DiceStyle";
import { GalaxyMaterial } from "./galaxy/GalaxyMaterial";
import { GemstoneMaterial } from "./gemstone/GemstoneMaterial";
import { GlassMaterial } from "./glass/GlassMaterial";
import { IronMaterial } from "./iron/IronMaterial";
import { NebulaMaterial } from "./nebula/NebulaMaterial";
import { SunriseMaterial } from "./sunrise/SunriseMaterial";
import { SunsetMaterial } from "./sunset/SunsetMaterial";
import { WalnutMaterial } from "./walnut/WalnutMaterial";

export function DiceMaterial({
  diceStyle,
  emissiveColor,
}: {
  diceStyle: DiceStyle;
  emissiveColor?: string;
}) {
  const emissiveProps = emissiveColor
    ? { emissive: new THREE.Color(emissiveColor), emissiveIntensity: 0.4 }
    : {};

  switch (diceStyle) {
    case "GALAXY":
      return <GalaxyMaterial {...emissiveProps} />;
    case "GEMSTONE":
      return <GemstoneMaterial {...emissiveProps} />;
    case "GLASS":
      return <GlassMaterial {...emissiveProps} />;
    case "IRON":
      return <IronMaterial {...emissiveProps} />;
    case "NEBULA":
      return <NebulaMaterial {...emissiveProps} />;
    case "SUNRISE":
      return <SunriseMaterial {...emissiveProps} />;
    case "SUNSET":
      return <SunsetMaterial {...emissiveProps} />;
    case "WALNUT":
      return <WalnutMaterial {...emissiveProps} />;
    default:
      throw Error(`Dice style ${diceStyle} error: not implemented`);
  }
}
