import React from "react";
import { Die } from "../types/Die";

import { DiceMesh } from "../meshes/DiceMesh";
import { DiceMaterial } from "../materials/DiceMaterial";
import { useDiceControlsStore } from "../controls/store";

type DiceProps = JSX.IntrinsicElements["group"] & { die: Die };

export const Dice = React.forwardRef<THREE.Group, DiceProps>(
  ({ die, children, ...props }, ref) => {
    const explosionGlowColor = useDiceControlsStore(
      (state) => state.explosionGlowColor
    );

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
        />
        {children}
      </DiceMesh>
    );
  }
);
