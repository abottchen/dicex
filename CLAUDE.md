# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn          # Install dependencies
yarn dev      # Start development server (Vite)
yarn build    # TypeScript check + production build
yarn preview  # Preview production build locally
```

There are no test commands. The `src/tests/` folder contains a fairness tester UI tool, not an automated test suite.

## Architecture

This is a 3D dice roller [Owlbear Rodeo VTT extension](https://extensions.owlbear.rodeo/dice). It uses React + Three.js for rendering and Rapier (WASM deterministic physics engine) for both animation and result generation.

**The key insight**: Because Rapier is deterministic, only the initial throw parameters need to be synced over the network — each client runs its own identical simulation and produces the same result.

### Three separate entry points (three separate Vite builds):

- `src/main.tsx` → standalone dice tray at `dice.owlbear.rodeo`
- `src/popover.tsx` → embedded popover within Owlbear Rodeo showing synced player rolls
- `src/background.ts` → background service managing plugin communication

### State management (Zustand):

- `src/controls/store.ts` (`useDiceControlsStore`) — UI state: which dice are selected, counts, bonus, advantage/disadvantage mode
- `src/dice/store.ts` (`useDiceRollStore`) — physics state: active roll throws, transform positions, final values

### Adding a new dice style

Four folders must be updated together: `src/materials/` (PBR textures), `src/meshes/` (3D geometry), `src/colliders/` (simplified physics geometry), `src/previews/` (2D UI preview images). Then register the set in `src/sets/diceSets.ts`.

### Key files

| File | Purpose |
|------|---------|
| `src/tray/InteractiveTray.tsx` | Root Three.js Canvas + Rapier physics world setup |
| `src/dice/PhysicsDice.tsx` | Single die: physics body, collision detection, value determination |
| `src/dice/InteractiveDiceRoll.tsx` | Orchestrates multiple dice rolling simultaneously |
| `src/helpers/DiceThrower.ts` | Generates random initial positions/velocities for fair rolls |
| `src/helpers/getCombinedDiceValue.ts` | Aggregates results (sum, highest/lowest for advantage) |
| `src/plugin/` | All Owlbear SDK integration code |
| `src/audio/` | Procedural Web Audio API dice impact sounds |
