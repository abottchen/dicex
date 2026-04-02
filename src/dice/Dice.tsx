import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Die } from "../types/Die";

import { DiceMesh } from "../meshes/DiceMesh";
import { DiceMaterial } from "../materials/DiceMaterial";
import { useDiceControlsStore } from "../controls/store";

const GLOW_MAX = 0.4;
const GLOW_MIN = GLOW_MAX * 0.1;
const GLOW_FADE_DURATION = 1;

type DiceProps = JSX.IntrinsicElements["group"] & { die: Die };

export const Dice = React.forwardRef<THREE.Group, DiceProps>(
  ({ die, children, ...props }, ref) => {
    const explosionGlowColor = useDiceControlsStore(
      (state) => state.explosionGlowColor
    );

    const glowElapsed = useRef(0);
    const glowIntensity = useRef(GLOW_MAX);

    useFrame((_, delta) => {
      if (!die.isExplosion) return;
      if (glowElapsed.current < GLOW_FADE_DURATION) {
        glowElapsed.current = Math.min(glowElapsed.current + delta, GLOW_FADE_DURATION);
        const t = glowElapsed.current / GLOW_FADE_DURATION;
        glowIntensity.current = GLOW_MAX - (GLOW_MAX - GLOW_MIN) * t;
      }
    });

    return (
      <DiceMesh
        diceType={die.type}
        {...props}
        sharp={die.style === "WALNUT"}
        ref={ref}
      >
        <DiceMaterial
          diceStyle={die.style}
          emissiveColor={die.isExplosion ? explosionGlowColor : undefined}
          emissiveIntensity={glowIntensity.current}
        />
        {children}
      </DiceMesh>
    );
  }
);
