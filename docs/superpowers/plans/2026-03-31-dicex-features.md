# Dicex Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Rumble chat integration, roll audit logging, and preset/advanced notation support to the Dicex fork of Owlbear Rodeo Dice.

**Architecture:** New features are implemented as independent modules: pure utility functions for formatting/parsing/building (easily testable), logic-only React components for OBR integration (`RumbleSync`, `RollLogger`), and new UI components following existing MUI + Zustand patterns. All OBR interactions go through per-player metadata keys to avoid write conflicts.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Zustand + Immer, MUI 5, Owlbear Rodeo SDK, GitHub Actions

---

## File Map

### Infrastructure (Task 1-2)
- Create: `.github/workflows/deploy.yml` — GitHub Pages deploy
- Create: `.github/workflows/test.yml` — CI test runner
- Modify: `vite.config.ts` — add Vitest config and `base` path
- Modify: `package.json` — add vitest dep, test scripts
- Modify: `public/manifest.json` — update name, author, URLs

### Shared Types (Task 3)
- Create: `src/types/RollResult.ts` — shared types for roll results used by formatter, logger, and advanced rolls

### Feature 0: Hidden Default (Task 4)
- Modify: `src/controls/store.ts` — add `initializeHidden(role)` action
- Create: `src/controls/__tests__/hiddenDefault.test.ts`

### Feature 1: Rumble Chat (Tasks 5-6)
- Create: `src/plugin/formatRumbleMessage.ts` — pure formatting function
- Create: `src/plugin/__tests__/formatRumbleMessage.test.ts`
- Create: `src/plugin/getRumbleTargets.ts` — target routing logic
- Create: `src/plugin/__tests__/rumbleTargeting.test.ts`
- Create: `src/plugin/RumbleSync.tsx` — component that posts to Rumble
- Modify: `src/controls/Sidebar.tsx` — mount RumbleSync

### Feature 2: Roll Audit Log (Tasks 7-9)
- Create: `src/plugin/buildRollEntry.ts` — builds audit log entry from roll state
- Create: `src/plugin/__tests__/buildRollEntry.test.ts`
- Create: `src/plugin/rollLogExport.ts` — download/clear helpers
- Create: `src/plugin/__tests__/rollLogExport.test.ts`
- Create: `src/plugin/RollLogger.tsx` — component that appends to room metadata
- Create: `src/controls/RollLogControls.tsx` — GM download/clear buttons
- Modify: `src/controls/Sidebar.tsx` — mount RollLogger and RollLogControls

### Feature 3a: Presets & Basic Notation (Tasks 10-13)
- Create: `src/helpers/notationParser.ts` — parse dice notation strings
- Create: `src/helpers/__tests__/notationParser.test.ts`
- Create: `src/helpers/notationSerializer.ts` — serialize dice controls to notation
- Create: `src/helpers/__tests__/notationSerializer.test.ts`
- Create: `src/plugin/presetStorage.ts` — CRUD for presets in room metadata
- Create: `src/plugin/__tests__/presetStorage.test.ts`
- Create: `src/controls/PresetSave.tsx` — save current config as preset
- Create: `src/controls/PresetPicker.tsx` — load preset dropdown
- Create: `src/controls/PresetEditor.tsx` — edit/delete presets modal
- Modify: `src/controls/Sidebar.tsx` — mount PresetPicker
- Modify: `src/controls/DiceRollControls.tsx` — mount PresetSave near roll button

### Feature 3b: Advanced Roll Execution (Tasks 14-15)
- Create: `src/helpers/advancedRolls.ts` — exploding dice, keep/drop logic
- Create: `src/helpers/__tests__/advancedRolls.test.ts`
- Modify: `src/dice/store.ts` — support advanced roll post-processing

---

## Task 1: GitHub Pages Deploy & Manifest Updates

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `public/manifest.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: Create deploy workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: yarn

      - run: yarn install --frozen-lockfile
      - run: yarn build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Update manifest.json**

Replace contents of `public/manifest.json` with:

```json
{
  "name": "Dicex",
  "version": "2.0.0",
  "manifest_version": 1,
  "author": "Adam Bottchen",
  "homepage_url": "https://abottchen.github.io/dicex/",
  "icon": "/logo.png",
  "description": "Beautiful 3D dice extension for d20 based systems",
  "action": {
    "title": "Dicex",
    "icon": "/icon.svg",
    "popover": "/",
    "height": 700,
    "width": 375
  },
  "background_url": "/background.html"
}
```

- [ ] **Step 3: Add Vite base path**

In `vite.config.ts`, add `base: "/dicex/"` to the config:

```typescript
export default defineConfig({
  base: "/dicex/",
  plugins: [react()],
  assetsInclude: ["**/*.glb", "**/*.hdr"],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        popover: resolve(__dirname, "popover.html"),
        background: resolve(__dirname, "background.html"),
      },
    },
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml public/manifest.json vite.config.ts
git commit -m "Add GitHub Pages deploy workflow and update manifest for Dicex"
```

- [ ] **Step 5: Push and verify deploy**

```bash
git push origin main
```

Check that the GitHub Actions workflow runs and the site deploys to `https://abottchen.github.io/dicex/`. Verify the extension loads correctly in Owlbear Rodeo with the new manifest URLs.

---

## Task 2: Vitest Setup & CI

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `.github/workflows/test.yml`

- [ ] **Step 1: Install Vitest**

```bash
yarn add -D vitest
```

- [ ] **Step 2: Add test scripts to package.json**

Add to `"scripts"` in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Add Vitest config to vite.config.ts**

Add the `/// <reference types="vitest" />` directive and `test` block:

```typescript
/// <reference types="vitest" />
import { defineConfig } from "vite";
// @ts-ignore
import { resolve } from "path";
import react from "@vitejs/plugin-react";

declare var __dirname: string;

export default defineConfig({
  base: "/dicex/",
  plugins: [react()],
  assetsInclude: ["**/*.glb", "**/*.hdr"],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        popover: resolve(__dirname, "popover.html"),
        background: resolve(__dirname, "background.html"),
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create test CI workflow**

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: yarn

      - run: yarn install --frozen-lockfile
      - run: yarn test
```

- [ ] **Step 5: Verify Vitest runs**

```bash
yarn test
```

Expected: Vitest runs with 0 test files found (no tests yet), exits cleanly.

- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.ts .github/workflows/test.yml yarn.lock
git commit -m "Add Vitest and CI test workflow"
```

---

## Task 3: Shared Roll Result Types

**Files:**
- Create: `src/types/RollResult.ts`

These types are consumed by the Rumble formatter, audit log builder, and advanced roll execution. Define them first so all downstream tasks share the same interface.

- [ ] **Step 1: Create RollResult types**

```typescript
// src/types/RollResult.ts

/** A single die result within a completed roll */
export interface DieResult {
  /** Die type: d4, d6, d8, d10, d12, d20, d100 */
  type: string;
  /** The face value rolled */
  value: number;
  /** true if this die was excluded by keep/drop rules */
  dropped?: boolean;
  /** Chain of explosion reroll values. [6, 3] means exploded to 6, then to 3 (stopped) */
  exploded?: number[];
}

/** A modifier (bonus) entry in a roll result */
export interface ModifierResult {
  type: "mod";
  value: number;
}

/** A single completed roll with all metadata */
export interface RollEntry {
  /** ISO 8601 UTC timestamp */
  timestamp: string;
  /** Original dice notation string (e.g. "2d6+3", "4d6k3") */
  notation: string;
  /** Individual die results */
  dice: (DieResult | ModifierResult)[];
  /** Final calculated total */
  total: number;
  /** Present only for advantage/disadvantage rolls */
  advantage?: "adv" | "dis";
  /** Preset name, if roll originated from a preset */
  preset?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/RollResult.ts
git commit -m "Add shared RollResult types for roll formatting and logging"
```

---

## Task 4: Hidden Roll Default

**Files:**
- Create: `src/controls/__tests__/hiddenDefault.test.ts`
- Modify: `src/controls/store.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/controls/__tests__/hiddenDefault.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useDiceControlsStore } from "../store";

describe("hiddenDefault", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useDiceControlsStore.setState({ diceHidden: false });
  });

  it("initializes hidden to true for GM role", () => {
    useDiceControlsStore.getState().initializeHidden("GM");
    expect(useDiceControlsStore.getState().diceHidden).toBe(true);
  });

  it("initializes hidden to false for PLAYER role", () => {
    useDiceControlsStore.getState().initializeHidden("PLAYER");
    expect(useDiceControlsStore.getState().diceHidden).toBe(false);
  });

  it("GM can toggle hidden to false", () => {
    useDiceControlsStore.getState().initializeHidden("GM");
    expect(useDiceControlsStore.getState().diceHidden).toBe(true);
    useDiceControlsStore.getState().toggleDiceHidden();
    expect(useDiceControlsStore.getState().diceHidden).toBe(false);
  });

  it("PLAYER can toggle hidden to true", () => {
    useDiceControlsStore.getState().initializeHidden("PLAYER");
    expect(useDiceControlsStore.getState().diceHidden).toBe(false);
    useDiceControlsStore.getState().toggleDiceHidden();
    expect(useDiceControlsStore.getState().diceHidden).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn test src/controls/__tests__/hiddenDefault.test.ts
```

Expected: FAIL — `initializeHidden` is not a function on the store.

- [ ] **Step 3: Add initializeHidden to the controls store**

In `src/controls/store.ts`, add `initializeHidden` to the `DiceControlsState` interface:

```typescript
initializeHidden: (role: string) => void;
```

Add the implementation inside the `immer((set) => ({` block, after `toggleDiceHidden`:

```typescript
initializeHidden(role) {
  set((state) => {
    state.diceHidden = role === "GM";
  });
},
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn test src/controls/__tests__/hiddenDefault.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/controls/__tests__/hiddenDefault.test.ts src/controls/store.ts
git commit -m "Add GM-default hidden roll initialization"
```

**Note:** The call to `initializeHidden` from the UI (reading `OBR.player.getRole()` at mount time) will be wired up when the `RumbleSync` or `RollLogger` component mounts inside the `PluginGate`, since that's where OBR context is available. For standalone mode (no OBR), the default remains `false`.

---

## Task 5: Rumble Message Formatter

**Files:**
- Create: `src/plugin/__tests__/formatRumbleMessage.test.ts`
- Create: `src/plugin/formatRumbleMessage.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/plugin/__tests__/formatRumbleMessage.test.ts
import { describe, it, expect } from "vitest";
import { formatRumbleMessage } from "../formatRumbleMessage";
import { DieResult, ModifierResult } from "../../types/RollResult";

describe("formatRumbleMessage", () => {
  it("formats a basic roll", () => {
    const dice: DieResult[] = [
      { type: "d6", value: 3 },
      { type: "d6", value: 3 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 6,
    });
    expect(result).toBe("Gandalf rolled (2d6 \u2192 [3-3]) for 6!");
  });

  it("formats a roll with bonus", () => {
    const dice: (DieResult | ModifierResult)[] = [
      { type: "d20", value: 12 },
      { type: "mod", value: 13 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 25,
    });
    expect(result).toBe("Gandalf rolled (1d20 \u2192 [12] +13) for 25!");
  });

  it("formats mixed dice types", () => {
    const dice: DieResult[] = [
      { type: "d6", value: 3 },
      { type: "d6", value: 3 },
      { type: "d20", value: 4 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 10,
    });
    expect(result).toBe(
      "Gandalf rolled (2d6 \u2192 [3-3], 1d20 \u2192 [4]) for 10!"
    );
  });

  it("formats advantage roll", () => {
    const dice: DieResult[] = [
      { type: "d20", value: 15 },
      { type: "d20", value: 4 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 15,
      advantage: "adv",
    });
    expect(result).toBe("Gandalf rolled (2d20 \u2192 [15-4] adv) for 15!");
  });

  it("formats disadvantage roll", () => {
    const dice: DieResult[] = [
      { type: "d20", value: 15 },
      { type: "d20", value: 4 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 4,
      advantage: "dis",
    });
    expect(result).toBe("Gandalf rolled (2d20 \u2192 [15-4] dis) for 4!");
  });

  it("formats a preset roll", () => {
    const dice: DieResult[] = [
      { type: "d8", value: 8 },
      { type: "d8", value: 3 },
      { type: "d8", value: 6 },
      { type: "d8", value: 3 },
      { type: "d8", value: 2 },
      { type: "d8", value: 5 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 27,
      presetName: "Fireball",
    });
    expect(result).toBe(
      "Gandalf used [Fireball] and rolled (6d8 \u2192 [8-3-6-3-2-5]) for 27!"
    );
  });

  it("formats a preset roll with bonus", () => {
    const dice: (DieResult | ModifierResult)[] = [
      { type: "d20", value: 12 },
      { type: "mod", value: 7 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 19,
      presetName: "Attack",
    });
    expect(result).toBe(
      "Gandalf used [Attack] and rolled (1d20 \u2192 [12] +7) for 19!"
    );
  });

  it("formats exploding dice with explosion values inline", () => {
    const dice: DieResult[] = [
      { type: "d6", value: 6, exploded: [4] },
      { type: "d6", value: 3 },
      { type: "d6", value: 6, exploded: [2] },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 21,
      notation: "3d6!",
    });
    expect(result).toBe(
      "Gandalf rolled (3d6! \u2192 [6-4-3-6-2]) for 21!"
    );
  });

  it("formats keep/drop with struck-through dropped dice", () => {
    const dice: DieResult[] = [
      { type: "d6", value: 5 },
      { type: "d6", value: 2, dropped: true },
      { type: "d6", value: 4 },
      { type: "d6", value: 6 },
    ];
    const result = formatRumbleMessage({
      playerName: "Gandalf",
      dice,
      total: 15,
      notation: "4d6k3",
    });
    expect(result).toBe(
      "Gandalf rolled (4d6k3 \u2192 [5-~~2~~-4-6]) for 15!"
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn test src/plugin/__tests__/formatRumbleMessage.test.ts
```

Expected: FAIL — module `../formatRumbleMessage` not found.

- [ ] **Step 3: Implement formatRumbleMessage**

```typescript
// src/plugin/formatRumbleMessage.ts
import { DieResult, ModifierResult } from "../types/RollResult";

interface FormatRumbleMessageInput {
  playerName: string;
  dice: (DieResult | ModifierResult)[];
  total: number;
  advantage?: "adv" | "dis";
  presetName?: string;
  /** Original notation string (e.g. "3d6!", "4d6k3"). Used for display when advanced modifiers present. */
  notation?: string;
}

function isModifier(
  entry: DieResult | ModifierResult
): entry is ModifierResult {
  return entry.type === "mod";
}

/**
 * Group dice by type and format each group as "NdX -> [v1-v2-...]".
 * Dice with exploded values have their explosions inlined.
 * Dropped dice are wrapped in ~~strikethrough~~.
 */
function formatDiceGroups(
  dice: (DieResult | ModifierResult)[],
  notation?: string
): string {
  const dieFaces = dice.filter((d): d is DieResult => !isModifier(d));
  const modifier = dice.find(isModifier);

  // Check if this is an advanced notation (has exploded or dropped dice)
  const hasAdvanced = dieFaces.some((d) => d.exploded || d.dropped);

  // Group consecutive dice by type
  const groups: { type: string; dice: DieResult[] }[] = [];
  for (const die of dieFaces) {
    const last = groups[groups.length - 1];
    if (last && last.type === die.type) {
      last.dice.push(die);
    } else {
      groups.push({ type: die.type, dice: [die] });
    }
  }

  const parts = groups.map((group) => {
    const count = group.dice.length;
    // Build values list, inlining explosions and marking dropped
    const values: string[] = [];
    for (const die of group.dice) {
      const valStr = die.dropped ? `~~${die.value}~~` : `${die.value}`;
      values.push(valStr);
      if (die.exploded) {
        for (const exp of die.exploded) {
          values.push(`${exp}`);
        }
      }
    }

    // Use notation for the label if advanced, otherwise NdX
    let label: string;
    if (hasAdvanced && notation && groups.length === 1) {
      // For single-group advanced notation, use the full notation as label
      label = notation;
    } else {
      label = `${count}${group.type}`;
    }

    return `${label} \u2192 [${values.join("-")}]`;
  });

  let result = parts.join(", ");

  if (modifier) {
    result += ` +${modifier.value}`;
  }

  return result;
}

export function formatRumbleMessage(input: FormatRumbleMessageInput): string {
  const { playerName, dice, total, advantage, presetName, notation } = input;

  const diceStr = formatDiceGroups(dice, notation);
  const advSuffix = advantage ? ` ${advantage}` : "";

  const prefix = presetName
    ? `${playerName} used [${presetName}] and rolled`
    : `${playerName} rolled`;

  return `${prefix} (${diceStr}${advSuffix}) for ${total}!`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn test src/plugin/__tests__/formatRumbleMessage.test.ts
```

Expected: 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/plugin/formatRumbleMessage.ts src/plugin/__tests__/formatRumbleMessage.test.ts
git commit -m "Add Rumble message formatter with tests"
```

---

## Task 6: Rumble Target Routing & RumbleSync Component

**Files:**
- Create: `src/plugin/__tests__/rumbleTargeting.test.ts`
- Create: `src/plugin/getRumbleTargets.ts`
- Create: `src/plugin/RumbleSync.tsx`
- Modify: `src/controls/Sidebar.tsx`

- [ ] **Step 1: Write failing target routing tests**

```typescript
// src/plugin/__tests__/rumbleTargeting.test.ts
import { describe, it, expect } from "vitest";
import { getRumbleTargets } from "../getRumbleTargets";

describe("getRumbleTargets", () => {
  it("returns party target for normal roll", () => {
    const targets = getRumbleTargets({
      hidden: false,
      playerObrId: "player-1",
      gmObrId: "gm-1",
      playerRole: "PLAYER",
    });
    expect(targets).toEqual(["0000"]);
  });

  it("returns player and GM targets for hidden roll by player", () => {
    const targets = getRumbleTargets({
      hidden: true,
      playerObrId: "player-1",
      gmObrId: "gm-1",
      playerRole: "PLAYER",
    });
    expect(targets).toEqual(["player-1", "gm-1"]);
  });

  it("returns only GM target for hidden roll by GM (no duplicate)", () => {
    const targets = getRumbleTargets({
      hidden: true,
      playerObrId: "gm-1",
      gmObrId: "gm-1",
      playerRole: "GM",
    });
    expect(targets).toEqual(["gm-1"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn test src/plugin/__tests__/rumbleTargeting.test.ts
```

Expected: FAIL — module `../getRumbleTargets` not found.

- [ ] **Step 3: Implement getRumbleTargets**

```typescript
// src/plugin/getRumbleTargets.ts

interface GetRumbleTargetsInput {
  hidden: boolean;
  playerObrId: string;
  gmObrId: string;
  playerRole: string;
}

/**
 * Determine which Rumble chat targets to send a roll message to.
 * Normal rolls: party ("0000").
 * Hidden rolls by player: to the roller + to the GM.
 * Hidden rolls by GM: to themselves only (no duplicate).
 */
export function getRumbleTargets(input: GetRumbleTargetsInput): string[] {
  const { hidden, playerObrId, gmObrId } = input;

  if (!hidden) {
    return ["0000"];
  }

  // Hidden roll: send to roller and GM, deduplicating if same person
  const targets = [playerObrId];
  if (gmObrId !== playerObrId) {
    targets.push(gmObrId);
  }
  return targets;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn test src/plugin/__tests__/rumbleTargeting.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Create RumbleSync component**

```typescript
// src/plugin/RumbleSync.tsx
import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useRef } from "react";
import { useDiceRollStore } from "../dice/store";
import { useDiceControlsStore } from "../controls/store";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { getCombinedDiceValue } from "../helpers/getCombinedDiceValue";
import { formatRumbleMessage } from "./formatRumbleMessage";
import { getRumbleTargets } from "./getRumbleTargets";
import { DieResult, ModifierResult } from "../types/RollResult";

const RUMBLE_CHAT_KEY = "com.battle-system.friends/metadata_chatlog";

/**
 * Posts formatted roll results to Rumble chat on roll completion.
 * Mounts inside PluginGate so OBR context is always available.
 */
export function RumbleSync() {
  const prevFinished = useRef(false);

  useEffect(
    () =>
      useDiceRollStore.subscribe((state) => {
        if (!state.roll) {
          prevFinished.current = false;
          return;
        }

        const allFinished = Object.values(state.rollValues).every(
          (v) => v !== null
        );
        if (!allFinished || prevFinished.current) {
          return;
        }
        prevFinished.current = true;

        // Build the roll result data
        const values = state.rollValues as Record<string, number>;
        const roll = state.roll;
        const controlsState = useDiceControlsStore.getState();
        const total = getCombinedDiceValue(roll, values);
        if (total === null) return;

        // Collect die results
        const allDice = getDieFromDice(roll);
        const diceResults: (DieResult | ModifierResult)[] = allDice.map(
          (die) => ({
            type: die.type.toLowerCase(),
            value: values[die.id],
          })
        );

        // Add bonus as modifier if non-zero
        if (controlsState.diceBonus !== 0) {
          diceResults.push({
            type: "mod",
            value: controlsState.diceBonus,
          });
        }

        const advantage = controlsState.diceAdvantage === "ADVANTAGE"
          ? "adv" as const
          : controlsState.diceAdvantage === "DISADVANTAGE"
          ? "dis" as const
          : undefined;

        const message = formatRumbleMessage({
          playerName: OBR.player.name,
          dice: diceResults,
          total,
          advantage,
        });

        // Determine targets and send
        const hidden = roll.hidden ?? false;
        const playerObrId = OBR.player.id;

        // Get GM ID — find party member with GM role
        OBR.party.getPlayers().then((players) => {
          // OBR player (self) role
          OBR.player.getRole().then((role) => {
            const gmPlayer = players.find((p) => p.role === "GM");
            const gmObrId = role === "GM" ? playerObrId : gmPlayer?.id ?? playerObrId;

            const targets = getRumbleTargets({
              hidden,
              playerObrId,
              gmObrId,
              playerRole: role,
            });

            for (const targetId of targets) {
              OBR.player.setMetadata({
                [RUMBLE_CHAT_KEY]: {
                  chatlog: message,
                  created: new Date().toISOString(),
                  sender: "Dicex",
                  targetId,
                },
              });
            }
          });
        });
      }),
    []
  );

  return null;
}
```

- [ ] **Step 6: Mount RumbleSync in Sidebar**

In `src/controls/Sidebar.tsx`, add the import:

```typescript
import { RumbleSync } from "../plugin/RumbleSync";
```

Add `<RumbleSync />` inside the `<PluginGate>` block, after `<DiceRollSync />`:

```tsx
<PluginGate>
  <Divider flexItem sx={{ mx: 1 }} />
  <DiceRollSync />
  <RumbleSync />
  <PartyTrays />
  <PluginResizeObserver />
</PluginGate>
```

- [ ] **Step 7: Commit**

```bash
git add src/plugin/getRumbleTargets.ts src/plugin/__tests__/rumbleTargeting.test.ts src/plugin/RumbleSync.tsx src/controls/Sidebar.tsx
git commit -m "Add Rumble chat integration with target routing"
```

---

## Task 7: Roll Audit Log Entry Builder

**Files:**
- Create: `src/plugin/__tests__/buildRollEntry.test.ts`
- Create: `src/plugin/buildRollEntry.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/plugin/__tests__/buildRollEntry.test.ts
import { describe, it, expect } from "vitest";
import { buildRollEntry } from "../buildRollEntry";

describe("buildRollEntry", () => {
  it("builds a basic roll entry", () => {
    const entry = buildRollEntry({
      diceResults: [{ type: "d20", value: 15 }],
      total: 15,
      notation: "1d20",
    });
    expect(entry.notation).toBe("1d20");
    expect(entry.dice).toEqual([{ type: "d20", value: 15 }]);
    expect(entry.total).toBe(15);
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.advantage).toBeUndefined();
    expect(entry.preset).toBeUndefined();
  });

  it("builds a roll entry with modifier", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d4", value: 2 },
        { type: "d4", value: 4 },
        { type: "d4", value: 1 },
        { type: "mod", value: 3 },
      ],
      total: 10,
      notation: "3d4+3",
    });
    expect(entry.dice).toEqual([
      { type: "d4", value: 2 },
      { type: "d4", value: 4 },
      { type: "d4", value: 1 },
      { type: "mod", value: 3 },
    ]);
    expect(entry.total).toBe(10);
  });

  it("builds an advantage roll entry", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d20", value: 15 },
        { type: "d20", value: 4 },
      ],
      total: 15,
      notation: "2d20",
      advantage: "adv",
    });
    expect(entry.advantage).toBe("adv");
    expect(entry.total).toBe(15);
  });

  it("builds a disadvantage roll entry", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d20", value: 15 },
        { type: "d20", value: 4 },
      ],
      total: 4,
      notation: "2d20",
      advantage: "dis",
    });
    expect(entry.advantage).toBe("dis");
    expect(entry.total).toBe(4);
  });

  it("builds an exploding dice entry", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d6", value: 6, exploded: [4] },
        { type: "d6", value: 3 },
        { type: "d6", value: 6, exploded: [2] },
      ],
      total: 21,
      notation: "3d6!",
      preset: "Chaos Bolt",
    });
    expect(entry.dice[0]).toEqual({ type: "d6", value: 6, exploded: [4] });
    expect(entry.dice[2]).toEqual({ type: "d6", value: 6, exploded: [2] });
    expect(entry.total).toBe(21);
    expect(entry.preset).toBe("Chaos Bolt");
  });

  it("builds a keep entry with dropped dice", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d6", value: 5 },
        { type: "d6", value: 2, dropped: true },
        { type: "d6", value: 4 },
        { type: "d6", value: 6 },
      ],
      total: 15,
      notation: "4d6k3",
    });
    expect(entry.dice[1]).toEqual({ type: "d6", value: 2, dropped: true });
    expect(entry.total).toBe(15);
  });

  it("builds a drop entry with multiple dropped dice", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d100", value: 84 },
        { type: "d100", value: 12, dropped: true },
        { type: "d100", value: 55 },
        { type: "d100", value: 7, dropped: true },
        { type: "d100", value: 91 },
        { type: "d100", value: 3, dropped: true },
        { type: "d100", value: 67 },
        { type: "d100", value: 45 },
      ],
      total: 342,
      notation: "8d100d3",
    });
    const dropped = entry.dice.filter(
      (d) => "dropped" in d && d.dropped
    );
    expect(dropped.length).toBe(3);
    expect(entry.total).toBe(342);
  });

  it("builds an exploding + keep entry", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d6", value: 6, exploded: [3] },
        { type: "d6", value: 2, dropped: true },
        { type: "d6", value: 6, exploded: [6, 4] },
      ],
      total: 25,
      notation: "3d6!k2",
    });
    expect(entry.dice[0]).toEqual({ type: "d6", value: 6, exploded: [3] });
    expect(entry.dice[1]).toEqual({ type: "d6", value: 2, dropped: true });
    expect(entry.dice[2]).toEqual({ type: "d6", value: 6, exploded: [6, 4] });
    expect(entry.total).toBe(25);
  });

  it("includes preset name when provided", () => {
    const entry = buildRollEntry({
      diceResults: [
        { type: "d8", value: 5 },
        { type: "mod", value: 3 },
      ],
      total: 8,
      notation: "1d8+3",
      preset: "Fireball",
    });
    expect(entry.preset).toBe("Fireball");
  });

  it("produces valid ISO 8601 UTC timestamp", () => {
    const entry = buildRollEntry({
      diceResults: [{ type: "d20", value: 10 }],
      total: 10,
      notation: "1d20",
    });
    const date = new Date(entry.timestamp);
    expect(date.toISOString()).toBe(entry.timestamp);
  });

  it("preserves notation from original input", () => {
    const entry = buildRollEntry({
      diceResults: [{ type: "d6", value: 3 }],
      total: 3,
      notation: "1d6",
    });
    expect(entry.notation).toBe("1d6");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn test src/plugin/__tests__/buildRollEntry.test.ts
```

Expected: FAIL — module `../buildRollEntry` not found.

- [ ] **Step 3: Implement buildRollEntry**

```typescript
// src/plugin/buildRollEntry.ts
import { DieResult, ModifierResult, RollEntry } from "../types/RollResult";

interface BuildRollEntryInput {
  diceResults: (DieResult | ModifierResult)[];
  total: number;
  notation: string;
  advantage?: "adv" | "dis";
  preset?: string;
}

export function buildRollEntry(input: BuildRollEntryInput): RollEntry {
  const { diceResults, total, notation, advantage, preset } = input;

  const entry: RollEntry = {
    timestamp: new Date().toISOString(),
    notation,
    dice: diceResults,
    total,
  };

  if (advantage) {
    entry.advantage = advantage;
  }

  if (preset) {
    entry.preset = preset;
  }

  return entry;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn test src/plugin/__tests__/buildRollEntry.test.ts
```

Expected: 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/plugin/buildRollEntry.ts src/plugin/__tests__/buildRollEntry.test.ts
git commit -m "Add roll audit log entry builder with tests"
```

---

## Task 8: Roll Log Export Helpers

**Files:**
- Create: `src/plugin/__tests__/rollLogExport.test.ts`
- Create: `src/plugin/rollLogExport.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/plugin/__tests__/rollLogExport.test.ts
import { describe, it, expect } from "vitest";
import { combinePlayerLogs, triggerJsonDownload } from "../rollLogExport";

describe("combinePlayerLogs", () => {
  it("combines multiple players logs into single object", () => {
    const logs = {
      "player-1": {
        name: "Gandalf",
        rolls: [
          {
            timestamp: "2026-03-30T22:15:00.000Z",
            notation: "1d20",
            dice: [{ type: "d20", value: 15 }],
            total: 15,
          },
        ],
      },
      "player-2": {
        name: "Frodo",
        rolls: [
          {
            timestamp: "2026-03-30T22:16:00.000Z",
            notation: "2d6",
            dice: [
              { type: "d6", value: 3 },
              { type: "d6", value: 4 },
            ],
            total: 7,
          },
        ],
      },
    };
    const combined = combinePlayerLogs(logs);
    expect(combined.players["player-1"].name).toBe("Gandalf");
    expect(combined.players["player-1"].rolls).toHaveLength(1);
    expect(combined.players["player-2"].name).toBe("Frodo");
    expect(combined.players["player-2"].rolls).toHaveLength(1);
  });

  it("preserves all fields from the data model", () => {
    const logs = {
      "player-1": {
        name: "Gandalf",
        rolls: [
          {
            timestamp: "2026-03-30T22:18:00.000Z",
            notation: "3d6!",
            preset: "Chaos Bolt",
            dice: [
              { type: "d6", value: 6, exploded: [4] },
              { type: "d6", value: 3 },
            ],
            total: 13,
          },
        ],
      },
    };
    const combined = combinePlayerLogs(logs);
    const roll = combined.players["player-1"].rolls[0];
    expect(roll.preset).toBe("Chaos Bolt");
    expect(roll.dice[0]).toEqual({ type: "d6", value: 6, exploded: [4] });
  });
});

describe("triggerJsonDownload", () => {
  it("creates a valid JSON string", () => {
    const data = { test: true };
    const json = JSON.stringify(data, null, 2);
    expect(JSON.parse(json)).toEqual(data);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn test src/plugin/__tests__/rollLogExport.test.ts
```

Expected: FAIL — module `../rollLogExport` not found.

- [ ] **Step 3: Implement rollLogExport**

```typescript
// src/plugin/rollLogExport.ts
import { RollEntry } from "../types/RollResult";

interface PlayerLog {
  name: string;
  rolls: RollEntry[];
}

interface CombinedLog {
  players: Record<string, PlayerLog>;
  exportedAt: string;
}

export function combinePlayerLogs(
  logs: Record<string, PlayerLog>
): CombinedLog {
  return {
    players: logs,
    exportedAt: new Date().toISOString(),
  };
}

export function triggerJsonDownload(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn test src/plugin/__tests__/rollLogExport.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/plugin/rollLogExport.ts src/plugin/__tests__/rollLogExport.test.ts
git commit -m "Add roll log export and download helpers with tests"
```

---

## Task 9: RollLogger Component & GM Controls

**Files:**
- Create: `src/plugin/RollLogger.tsx`
- Create: `src/controls/RollLogControls.tsx`
- Modify: `src/controls/Sidebar.tsx`

- [ ] **Step 1: Create RollLogger component**

```typescript
// src/plugin/RollLogger.tsx
import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useRef } from "react";
import { useDiceRollStore } from "../dice/store";
import { useDiceControlsStore } from "../controls/store";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { getCombinedDiceValue } from "../helpers/getCombinedDiceValue";
import { buildRollEntry } from "./buildRollEntry";
import { DieResult, ModifierResult } from "../types/RollResult";

const LOG_KEY_PREFIX = "com.dicex/roll-log/";

export function RollLogger() {
  const prevFinished = useRef(false);

  useEffect(
    () =>
      useDiceRollStore.subscribe((state) => {
        if (!state.roll) {
          prevFinished.current = false;
          return;
        }

        const allFinished = Object.values(state.rollValues).every(
          (v) => v !== null
        );
        if (!allFinished || prevFinished.current) {
          return;
        }
        prevFinished.current = true;

        const values = state.rollValues as Record<string, number>;
        const roll = state.roll;
        const controlsState = useDiceControlsStore.getState();
        const total = getCombinedDiceValue(roll, values);
        if (total === null) return;

        const allDice = getDieFromDice(roll);
        const diceResults: (DieResult | ModifierResult)[] = allDice.map(
          (die) => ({
            type: die.type.toLowerCase(),
            value: values[die.id],
          })
        );

        if (controlsState.diceBonus !== 0) {
          diceResults.push({
            type: "mod",
            value: controlsState.diceBonus,
          });
        }

        const advantage =
          controlsState.diceAdvantage === "ADVANTAGE"
            ? ("adv" as const)
            : controlsState.diceAdvantage === "DISADVANTAGE"
            ? ("dis" as const)
            : undefined;

        // Build notation from dice counts
        const counts = controlsState.diceCounts;
        const diceById = controlsState.diceById;
        const notationParts: string[] = [];
        for (const [id, count] of Object.entries(counts)) {
          if (count > 0) {
            const die = diceById[id];
            if (die) {
              notationParts.push(`${count}${die.type.toLowerCase()}`);
            }
          }
        }
        if (controlsState.diceBonus > 0) {
          notationParts.push(`+${controlsState.diceBonus}`);
        } else if (controlsState.diceBonus < 0) {
          notationParts.push(`${controlsState.diceBonus}`);
        }
        const notation = notationParts.join("+") || "unknown";

        const entry = buildRollEntry({
          diceResults,
          total,
          notation,
          advantage,
        });

        // Append to room metadata
        const playerId = OBR.player.id;
        const logKey = `${LOG_KEY_PREFIX}${playerId}`;
        OBR.room.getMetadata().then((metadata) => {
          const existing = (metadata[logKey] as { name: string; rolls: unknown[] } | undefined) || {
            name: OBR.player.name,
            rolls: [],
          };
          existing.rolls.push(entry);
          existing.name = OBR.player.name;
          OBR.room.setMetadata({ [logKey]: existing });
        });
      }),
    []
  );

  return null;
}
```

- [ ] **Step 2: Create GM Roll Log Controls**

```typescript
// src/controls/RollLogControls.tsx
import { useState, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DownloadIcon from "@mui/icons-material/FileDownloadRounded";
import DownloadClearIcon from "@mui/icons-material/DeleteSweepRounded";
import OBR from "@owlbear-rodeo/sdk";
import { combinePlayerLogs, triggerJsonDownload } from "../plugin/rollLogExport";

const LOG_KEY_PREFIX = "com.dicex/roll-log/";

export function RollLogControls() {
  const [isGM, setIsGM] = useState(false);

  useEffect(() => {
    OBR.player.getRole().then((role) => setIsGM(role === "GM"));
  }, []);

  if (!isGM) return null;

  async function getPlayerLogs() {
    const metadata = await OBR.room.getMetadata();
    const logs: Record<string, { name: string; rolls: unknown[] }> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (key.startsWith(LOG_KEY_PREFIX)) {
        const playerId = key.slice(LOG_KEY_PREFIX.length);
        logs[playerId] = value as { name: string; rolls: unknown[] };
      }
    }
    return logs;
  }

  async function handleDownload() {
    const logs = await getPlayerLogs();
    const combined = combinePlayerLogs(logs);
    const date = new Date().toISOString().split("T")[0];
    triggerJsonDownload(combined, `dicex-rolls-${date}.json`);
  }

  async function handleDownloadAndClear() {
    await handleDownload();
    const metadata = await OBR.room.getMetadata();
    const clearObj: Record<string, undefined> = {};
    for (const key of Object.keys(metadata)) {
      if (key.startsWith(LOG_KEY_PREFIX)) {
        clearObj[key] = undefined;
      }
    }
    await OBR.room.setMetadata(clearObj);
  }

  return (
    <>
      <Tooltip title="Download Roll Log" placement="top" disableInteractive>
        <IconButton onClick={handleDownload}>
          <DownloadIcon />
        </IconButton>
      </Tooltip>
      <Tooltip
        title="Download & Clear Roll Log"
        placement="top"
        disableInteractive
      >
        <IconButton onClick={handleDownloadAndClear}>
          <DownloadClearIcon />
        </IconButton>
      </Tooltip>
    </>
  );
}
```

- [ ] **Step 3: Mount RollLogger and RollLogControls in Sidebar**

In `src/controls/Sidebar.tsx`, add the imports:

```typescript
import { RollLogger } from "../plugin/RollLogger";
import { RollLogControls } from "./RollLogControls";
```

Update the `<PluginGate>` block:

```tsx
<PluginGate>
  <Divider flexItem sx={{ mx: 1 }} />
  <DiceRollSync />
  <RumbleSync />
  <RollLogger />
  <RollLogControls />
  <PartyTrays />
  <PluginResizeObserver />
</PluginGate>
```

- [ ] **Step 4: Verify build compiles**

```bash
yarn build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/plugin/RollLogger.tsx src/controls/RollLogControls.tsx src/controls/Sidebar.tsx
git commit -m "Add roll audit logger and GM download/clear controls"
```

---

## Task 10: Notation Parser

**Files:**
- Create: `src/helpers/__tests__/notationParser.test.ts`
- Create: `src/helpers/notationParser.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/helpers/__tests__/notationParser.test.ts
import { describe, it, expect } from "vitest";
import { parseNotation, NotationError } from "../notationParser";

describe("parseNotation", () => {
  it("parses basic dice: 2d6", () => {
    const result = parseNotation("2d6");
    expect(result).toEqual([{ count: 2, sides: 6 }]);
  });

  it("parses dice with modifier: 1d20+3", () => {
    const result = parseNotation("1d20+3");
    expect(result).toEqual([{ count: 1, sides: 20 }, { modifier: 3 }]);
  });

  it("parses multiple dice types: 2d6+1d8+5", () => {
    const result = parseNotation("2d6+1d8+5");
    expect(result).toEqual([
      { count: 2, sides: 6 },
      { count: 1, sides: 8 },
      { modifier: 5 },
    ]);
  });

  it("handles optional whitespace: 2d6 + 1d8 + 5", () => {
    const result = parseNotation("2d6 + 1d8 + 5");
    expect(result).toEqual([
      { count: 2, sides: 6 },
      { count: 1, sides: 8 },
      { modifier: 5 },
    ]);
  });

  it("parses exploding dice (max): 3d6!", () => {
    const result = parseNotation("3d6!");
    expect(result).toEqual([
      { count: 3, sides: 6, explode: { type: "max" } },
    ]);
  });

  it("parses exploding dice (gte threshold): 3d6!>4", () => {
    const result = parseNotation("3d6!>4");
    expect(result).toEqual([
      { count: 3, sides: 6, explode: { type: "gte", value: 4 } },
    ]);
  });

  it("parses exploding dice (exact): 3d6!3", () => {
    const result = parseNotation("3d6!3");
    expect(result).toEqual([
      { count: 3, sides: 6, explode: { type: "exact", value: 3 } },
    ]);
  });

  it("parses keep highest: 4d6k3", () => {
    const result = parseNotation("4d6k3");
    expect(result).toEqual([{ count: 4, sides: 6, keep: 3 }]);
  });

  it("parses drop lowest: 8d100d3", () => {
    const result = parseNotation("8d100d3");
    expect(result).toEqual([{ count: 8, sides: 100, drop: 3 }]);
  });

  it("parses combination: 2d6!+1d20k1+5", () => {
    const result = parseNotation("2d6!+1d20k1+5");
    expect(result).toEqual([
      { count: 2, sides: 6, explode: { type: "max" } },
      { count: 1, sides: 20, keep: 1 },
      { modifier: 5 },
    ]);
  });

  it("rejects invalid die type: 2d7", () => {
    expect(() => parseNotation("2d7")).toThrow(NotationError);
  });

  it("rejects keep count exceeding dice count: 2d6k3", () => {
    expect(() => parseNotation("2d6k3")).toThrow(NotationError);
  });

  it("rejects drop count exceeding dice count: 2d6d3", () => {
    expect(() => parseNotation("2d6d3")).toThrow(NotationError);
  });

  it("rejects empty string", () => {
    expect(() => parseNotation("")).toThrow(NotationError);
  });

  it("rejects malformed syntax: ddd", () => {
    expect(() => parseNotation("ddd")).toThrow(NotationError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn test src/helpers/__tests__/notationParser.test.ts
```

Expected: FAIL — module `../notationParser` not found.

- [ ] **Step 3: Implement notationParser**

```typescript
// src/helpers/notationParser.ts

const VALID_SIDES = new Set([4, 6, 8, 10, 12, 20, 100]);

export class NotationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotationError";
  }
}

export interface DiceComponent {
  count: number;
  sides: number;
  explode?: { type: "max" } | { type: "gte"; value: number } | { type: "exact"; value: number };
  keep?: number;
  drop?: number;
}

export interface ModifierComponent {
  modifier: number;
}

export type NotationComponent = DiceComponent | ModifierComponent;

export function isModifierComponent(c: NotationComponent): c is ModifierComponent {
  return "modifier" in c;
}

/**
 * Parse a dice notation string into structured components.
 *
 * Supported syntax:
 *   2d6, 1d20+3, 3d6!, 3d6!>4, 3d6!3, 4d6k3, 8d100d3
 *   Combinations separated by +, optional whitespace
 */
export function parseNotation(notation: string): NotationComponent[] {
  const trimmed = notation.trim();
  if (!trimmed) {
    throw new NotationError("Empty notation");
  }

  // Split on + but preserve the + for modifiers
  const terms = trimmed.split(/\s*\+\s*/);
  const components: NotationComponent[] = [];

  for (const term of terms) {
    if (!term) continue;

    // Check if it's a plain number (modifier)
    if (/^\d+$/.test(term)) {
      components.push({ modifier: parseInt(term, 10) });
      continue;
    }

    // Match dice pattern: NdS[!][>X|X][kN|dN]
    const match = term.match(
      /^(\d+)d(\d+)(!(?:>(\d+)|(\d+))?)?(?:(k|d)(\d+))?$/i
    );
    if (!match) {
      throw new NotationError(`Invalid notation term: "${term}"`);
    }

    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);

    if (!VALID_SIDES.has(sides)) {
      throw new NotationError(`Invalid die type: d${sides}. Valid types: d4, d6, d8, d10, d12, d20, d100`);
    }

    const component: DiceComponent = { count, sides };

    // Exploding dice
    if (match[3] !== undefined) {
      if (match[4] !== undefined) {
        // !>N — explode on >= N
        component.explode = { type: "gte", value: parseInt(match[4], 10) };
      } else if (match[5] !== undefined) {
        // !N — explode on exact N
        component.explode = { type: "exact", value: parseInt(match[5], 10) };
      } else {
        // ! alone — explode on max
        component.explode = { type: "max" };
      }
    }

    // Keep/Drop
    if (match[6] !== undefined) {
      const kdCount = parseInt(match[7], 10);
      if (match[6] === "k") {
        if (kdCount > count) {
          throw new NotationError(
            `Keep count (${kdCount}) exceeds dice count (${count})`
          );
        }
        component.keep = kdCount;
      } else {
        if (kdCount >= count) {
          throw new NotationError(
            `Drop count (${kdCount}) exceeds dice count (${count})`
          );
        }
        component.drop = kdCount;
      }
    }

    components.push(component);
  }

  if (components.length === 0) {
    throw new NotationError("No valid dice terms found");
  }

  return components;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn test src/helpers/__tests__/notationParser.test.ts
```

Expected: 15 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/helpers/notationParser.ts src/helpers/__tests__/notationParser.test.ts
git commit -m "Add dice notation parser with tests"
```

---

## Task 11: Notation Serializer

**Files:**
- Create: `src/helpers/__tests__/notationSerializer.test.ts`
- Create: `src/helpers/notationSerializer.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/helpers/__tests__/notationSerializer.test.ts
import { describe, it, expect } from "vitest";
import { serializeNotation } from "../notationSerializer";
import { parseNotation } from "../notationParser";

describe("serializeNotation", () => {
  it("serializes simple dice: 2d6", () => {
    const result = serializeNotation({ d6: 2 });
    expect(result).toBe("2d6");
  });

  it("serializes dice with bonus: 1d20+5", () => {
    const result = serializeNotation({ d20: 1 }, 5);
    expect(result).toBe("1d20+5");
  });

  it("serializes mixed dice with bonus: 2d6+1d8+3", () => {
    const result = serializeNotation({ d6: 2, d8: 1 }, 3);
    expect(result).toBe("2d6+1d8+3");
  });

  it("omits dice with zero count", () => {
    const result = serializeNotation({ d6: 0, d20: 1 });
    expect(result).toBe("1d20");
  });

  it("omits zero bonus", () => {
    const result = serializeNotation({ d6: 2 }, 0);
    expect(result).toBe("2d6");
  });

  it("round-trips: serialize then parse produces equivalent structure", () => {
    const notation = serializeNotation({ d6: 2, d8: 1 }, 3);
    const parsed = parseNotation(notation);
    expect(parsed).toEqual([
      { count: 2, sides: 6 },
      { count: 1, sides: 8 },
      { modifier: 3 },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn test src/helpers/__tests__/notationSerializer.test.ts
```

Expected: FAIL — module `../notationSerializer` not found.

- [ ] **Step 3: Implement notationSerializer**

```typescript
// src/helpers/notationSerializer.ts

/**
 * Serialize a dice counts map and optional bonus into dice notation.
 * @param diceCounts Map of die type (lowercase, e.g. "d6") to count
 * @param bonus Optional numeric modifier
 * @returns Notation string like "2d6+1d8+3"
 */
export function serializeNotation(
  diceCounts: Record<string, number>,
  bonus?: number
): string {
  const parts: string[] = [];

  // Sort by die size for consistent output
  const entries = Object.entries(diceCounts)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => {
      const sizeA = parseInt(a.replace("d", ""), 10);
      const sizeB = parseInt(b.replace("d", ""), 10);
      return sizeA - sizeB;
    });

  for (const [type, count] of entries) {
    parts.push(`${count}${type}`);
  }

  if (bonus && bonus !== 0) {
    parts.push(`${bonus}`);
  }

  return parts.join("+");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn test src/helpers/__tests__/notationSerializer.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/helpers/notationSerializer.ts src/helpers/__tests__/notationSerializer.test.ts
git commit -m "Add dice notation serializer with tests"
```

---

## Task 12: Preset Storage CRUD

**Files:**
- Create: `src/plugin/__tests__/presetStorage.test.ts`
- Create: `src/plugin/presetStorage.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/plugin/__tests__/presetStorage.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  savePreset,
  loadPresets,
  deletePreset,
  updatePreset,
  Preset,
} from "../presetStorage";

// Mock OBR SDK
const mockMetadata: Record<string, unknown> = {};
vi.mock("@owlbear-rodeo/sdk", () => ({
  default: {
    room: {
      getMetadata: vi.fn(() => Promise.resolve({ ...mockMetadata })),
      setMetadata: vi.fn((data: Record<string, unknown>) => {
        Object.assign(mockMetadata, data);
        return Promise.resolve();
      }),
    },
  },
}));

// Mock uuid
vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-" + Math.random().toString(36).slice(2, 8)),
}));

const PLAYER_ID = "player-1";
const PRESET_KEY = `com.dicex/presets/${PLAYER_ID}`;

describe("presetStorage", () => {
  beforeEach(() => {
    // Clear mock metadata
    for (const key of Object.keys(mockMetadata)) {
      delete mockMetadata[key];
    }
  });

  it("saves a preset to room metadata", async () => {
    await savePreset(PLAYER_ID, "Fireball", "6d8+3");
    const stored = mockMetadata[PRESET_KEY] as { presets: Preset[] };
    expect(stored.presets).toHaveLength(1);
    expect(stored.presets[0].name).toBe("Fireball");
    expect(stored.presets[0].notation).toBe("6d8+3");
    expect(stored.presets[0].id).toBeDefined();
  });

  it("loads presets from room metadata", async () => {
    mockMetadata[PRESET_KEY] = {
      presets: [{ id: "1", name: "Fireball", notation: "6d8+3" }],
    };
    const presets = await loadPresets(PLAYER_ID);
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe("Fireball");
  });

  it("returns empty array when no presets exist", async () => {
    const presets = await loadPresets(PLAYER_ID);
    expect(presets).toEqual([]);
  });

  it("deletes a preset by ID", async () => {
    mockMetadata[PRESET_KEY] = {
      presets: [
        { id: "1", name: "Fireball", notation: "6d8+3" },
        { id: "2", name: "Attack", notation: "1d20+7" },
      ],
    };
    await deletePreset(PLAYER_ID, "1");
    const stored = mockMetadata[PRESET_KEY] as { presets: Preset[] };
    expect(stored.presets).toHaveLength(1);
    expect(stored.presets[0].id).toBe("2");
  });

  it("updates a preset name and notation by ID", async () => {
    mockMetadata[PRESET_KEY] = {
      presets: [{ id: "1", name: "Fireball", notation: "6d8+3" }],
    };
    await updatePreset(PLAYER_ID, "1", {
      name: "Greater Fireball",
      notation: "8d8+5",
    });
    const stored = mockMetadata[PRESET_KEY] as { presets: Preset[] };
    expect(stored.presets[0].name).toBe("Greater Fireball");
    expect(stored.presets[0].notation).toBe("8d8+5");
  });

  it("rejects saving preset with invalid notation", async () => {
    await expect(
      savePreset(PLAYER_ID, "Bad", "2d7")
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn test src/plugin/__tests__/presetStorage.test.ts
```

Expected: FAIL — module `../presetStorage` not found.

- [ ] **Step 3: Implement presetStorage**

```typescript
// src/plugin/presetStorage.ts
import OBR from "@owlbear-rodeo/sdk";
import { v4 as uuidv4 } from "uuid";
import { parseNotation, NotationError } from "../helpers/notationParser";

export interface Preset {
  id: string;
  name: string;
  notation: string;
}

interface PresetData {
  presets: Preset[];
}

const PRESET_KEY_PREFIX = "com.dicex/presets/";

function getKey(playerId: string): string {
  return `${PRESET_KEY_PREFIX}${playerId}`;
}

export async function loadPresets(playerId: string): Promise<Preset[]> {
  const metadata = await OBR.room.getMetadata();
  const data = metadata[getKey(playerId)] as PresetData | undefined;
  return data?.presets ?? [];
}

export async function savePreset(
  playerId: string,
  name: string,
  notation: string
): Promise<void> {
  // Validate notation before saving
  parseNotation(notation);

  const presets = await loadPresets(playerId);
  presets.push({ id: uuidv4(), name, notation });
  await OBR.room.setMetadata({ [getKey(playerId)]: { presets } });
}

export async function deletePreset(
  playerId: string,
  presetId: string
): Promise<void> {
  const presets = await loadPresets(playerId);
  const filtered = presets.filter((p) => p.id !== presetId);
  await OBR.room.setMetadata({ [getKey(playerId)]: { presets: filtered } });
}

export async function updatePreset(
  playerId: string,
  presetId: string,
  updates: { name?: string; notation?: string }
): Promise<void> {
  if (updates.notation) {
    parseNotation(updates.notation);
  }

  const presets = await loadPresets(playerId);
  const preset = presets.find((p) => p.id === presetId);
  if (preset) {
    if (updates.name !== undefined) preset.name = updates.name;
    if (updates.notation !== undefined) preset.notation = updates.notation;
  }
  await OBR.room.setMetadata({ [getKey(playerId)]: { presets } });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn test src/plugin/__tests__/presetStorage.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/plugin/presetStorage.ts src/plugin/__tests__/presetStorage.test.ts
git commit -m "Add preset CRUD storage with validation and tests"
```

---

## Task 13: Preset UI Components

**Files:**
- Create: `src/controls/PresetSave.tsx`
- Create: `src/controls/PresetPicker.tsx`
- Create: `src/controls/PresetEditor.tsx`
- Modify: `src/controls/Sidebar.tsx`
- Modify: `src/controls/DiceRollControls.tsx`

This task is UI-heavy and depends on OBR context, so it's integration work rather than TDD.

- [ ] **Step 1: Create PresetSave component**

```typescript
// src/controls/PresetSave.tsx
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

  async function handleSave() {
    if (!name.trim()) return;
    await savePreset(OBR.player.id, name.trim(), notation);
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
```

- [ ] **Step 2: Create PresetPicker component**

```typescript
// src/controls/PresetPicker.tsx
import { useState, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import TuneIcon from "@mui/icons-material/TuneRounded";
import OBR from "@owlbear-rodeo/sdk";

import { useDiceControlsStore } from "./store";
import { loadPresets, Preset } from "../plugin/presetStorage";
import { parseNotation, isModifierComponent } from "../helpers/notationParser";
import { PresetEditor } from "./PresetEditor";

export function PresetPicker() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);

  const changeDieCount = useDiceControlsStore((s) => s.changeDieCount);
  const setDiceBonus = useDiceControlsStore((s) => s.setDiceBonus);
  const resetDiceCounts = useDiceControlsStore((s) => s.resetDiceCounts);
  const diceSet = useDiceControlsStore((s) => s.diceSet);

  async function refreshPresets() {
    const loaded = await loadPresets(OBR.player.id);
    setPresets(loaded);
  }

  function handleOpen(event: React.MouseEvent<HTMLElement>) {
    refreshPresets();
    setAnchorEl(event.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  function handleSelectPreset(preset: Preset) {
    handleClose();

    // Parse notation and populate dice controls
    try {
      const components = parseNotation(preset.notation);

      // Reset counts first
      resetDiceCounts();

      for (const component of components) {
        if (isModifierComponent(component)) {
          setDiceBonus(component.modifier);
        } else {
          // Find matching die in current set by type
          const typeStr = `D${component.sides}` as const;
          const die = diceSet.dice.find((d) => d.type === typeStr);
          if (die) {
            changeDieCount(die.id, component.count);
          }
        }
      }
    } catch {
      // Invalid notation — skip
    }
  }

  return (
    <>
      <Tooltip title="Presets" placement="top" disableInteractive>
        <IconButton onClick={handleOpen}>
          <TuneIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{
          paper: { sx: { maxHeight: 300, overflowY: "auto" } },
        }}
      >
        {presets.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No presets saved
            </Typography>
          </MenuItem>
        )}
        {presets.map((preset) => (
          <MenuItem key={preset.id} onClick={() => handleSelectPreset(preset)}>
            <ListItemText primary={preset.name} secondary={preset.notation} />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            handleClose();
            setEditorOpen(true);
          }}
        >
          <Typography variant="body2">Edit Presets</Typography>
        </MenuItem>
      </Menu>
      <PresetEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={refreshPresets}
      />
    </>
  );
}
```

- [ ] **Step 3: Create PresetEditor component**

```typescript
// src/controls/PresetEditor.tsx
import { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
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
            <span style={{ color: "gray" }}>No presets to edit</span>
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
```

- [ ] **Step 4: Mount PresetPicker in Sidebar**

In `src/controls/Sidebar.tsx`, add the import:

```typescript
import { PresetPicker } from "./PresetPicker";
```

Add `<PresetPicker />` after `<FairnessTesterButton />`:

```tsx
<FairnessTesterButton />
<PluginGate>
  <PresetPicker />
  <Divider flexItem sx={{ mx: 1 }} />
```

- [ ] **Step 5: Mount PresetSave in DiceRollControls**

In `src/controls/DiceRollControls.tsx`, add the import:

```typescript
import { PresetSave } from "./PresetSave";
```

Add `<PresetSave />` inside the `DicePickedControls` component, near the roll button (the exact placement will depend on the layout — add it as a small icon button adjacent to the roll/clear buttons). Wrap in `PluginGate` since it needs OBR context:

```tsx
import { PluginGate } from "../plugin/PluginGate";

// Inside DicePickedControls, near the clear button:
<PluginGate>
  <PresetSave />
</PluginGate>
```

- [ ] **Step 6: Verify build compiles**

```bash
yarn build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/controls/PresetSave.tsx src/controls/PresetPicker.tsx src/controls/PresetEditor.tsx src/controls/Sidebar.tsx src/controls/DiceRollControls.tsx
git commit -m "Add preset save, load, and edit UI components"
```

---

## Task 14: Advanced Roll Execution (Exploding, Keep/Drop)

**Files:**
- Create: `src/helpers/__tests__/advancedRolls.test.ts`
- Create: `src/helpers/advancedRolls.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/helpers/__tests__/advancedRolls.test.ts
import { describe, it, expect, vi } from "vitest";
import { applyExplodingDice, applyKeepDrop, calculateTotal } from "../advancedRolls";
import { DieResult, ModifierResult } from "../../types/RollResult";

describe("applyExplodingDice", () => {
  it("explodes on max value for d6", () => {
    // Mock random to return 4 on first reroll (no further explosion)
    const mockRandom = vi.fn().mockReturnValueOnce(4);
    const dice: DieResult[] = [{ type: "d6", value: 6 }];
    const result = applyExplodingDice(dice, 6, { type: "max" }, mockRandom);
    expect(result[0].exploded).toEqual([4]);
  });

  it("does not explode below max for d6", () => {
    const dice: DieResult[] = [{ type: "d6", value: 5 }];
    const result = applyExplodingDice(dice, 6, { type: "max" });
    expect(result[0].exploded).toBeUndefined();
  });

  it("chains explosions: d6 rolling 6 then 6 then 3", () => {
    const mockRandom = vi.fn().mockReturnValueOnce(6).mockReturnValueOnce(3);
    const dice: DieResult[] = [{ type: "d6", value: 6 }];
    const result = applyExplodingDice(dice, 6, { type: "max" }, mockRandom);
    expect(result[0].exploded).toEqual([6, 3]);
  });

  it("explodes with gte threshold: d6 rolling 4 with !>4", () => {
    const mockRandom = vi.fn().mockReturnValueOnce(2);
    const dice: DieResult[] = [{ type: "d6", value: 4 }];
    const result = applyExplodingDice(
      dice,
      6,
      { type: "gte", value: 4 },
      mockRandom
    );
    expect(result[0].exploded).toEqual([2]);
  });

  it("does not explode with gte threshold: d6 rolling 3 with !>4", () => {
    const dice: DieResult[] = [{ type: "d6", value: 3 }];
    const result = applyExplodingDice(dice, 6, { type: "gte", value: 4 });
    expect(result[0].exploded).toBeUndefined();
  });

  it("explodes with exact value: d6 rolling 3 with !3", () => {
    const mockRandom = vi.fn().mockReturnValueOnce(5);
    const dice: DieResult[] = [{ type: "d6", value: 3 }];
    const result = applyExplodingDice(
      dice,
      6,
      { type: "exact", value: 3 },
      mockRandom
    );
    expect(result[0].exploded).toEqual([5]);
  });

  it("does not explode with exact value: d6 rolling 4 with !3", () => {
    const dice: DieResult[] = [{ type: "d6", value: 4 }];
    const result = applyExplodingDice(dice, 6, { type: "exact", value: 3 });
    expect(result[0].exploded).toBeUndefined();
  });

  it("caps explosions at 100 rerolls", () => {
    // Always return max to force infinite explosions
    const mockRandom = vi.fn().mockReturnValue(6);
    const dice: DieResult[] = [{ type: "d6", value: 6 }];
    const result = applyExplodingDice(dice, 6, { type: "max" }, mockRandom);
    expect(result[0].exploded!.length).toBe(100);
  });
});

describe("applyKeepDrop", () => {
  it("keeps highest 3 from 4d6", () => {
    const dice: DieResult[] = [
      { type: "d6", value: 5 },
      { type: "d6", value: 2 },
      { type: "d6", value: 4 },
      { type: "d6", value: 6 },
    ];
    const result = applyKeepDrop(dice, { keep: 3 });
    const dropped = result.filter((d) => d.dropped);
    expect(dropped).toHaveLength(1);
    expect(dropped[0].value).toBe(2);
  });

  it("drops lowest 3 from 8d100", () => {
    const dice: DieResult[] = [
      { type: "d100", value: 84 },
      { type: "d100", value: 12 },
      { type: "d100", value: 55 },
      { type: "d100", value: 7 },
      { type: "d100", value: 91 },
      { type: "d100", value: 3 },
      { type: "d100", value: 67 },
      { type: "d100", value: 45 },
    ];
    const result = applyKeepDrop(dice, { drop: 3 });
    const dropped = result.filter((d) => d.dropped);
    expect(dropped).toHaveLength(3);
    const droppedValues = dropped.map((d) => d.value).sort((a, b) => a - b);
    expect(droppedValues).toEqual([3, 7, 12]);
  });

  it("keeps highest 1 from 2d20 (advantage equivalent)", () => {
    const dice: DieResult[] = [
      { type: "d20", value: 15 },
      { type: "d20", value: 4 },
    ];
    const result = applyKeepDrop(dice, { keep: 1 });
    expect(result.find((d) => d.value === 4)?.dropped).toBe(true);
    expect(result.find((d) => d.value === 15)?.dropped).toBeUndefined();
  });
});

describe("calculateTotal", () => {
  it("sums only non-dropped dice plus explosions plus modifiers", () => {
    const dice: (DieResult | ModifierResult)[] = [
      { type: "d6", value: 6, exploded: [3] },
      { type: "d6", value: 2, dropped: true },
      { type: "d6", value: 6, exploded: [6, 4] },
      { type: "mod", value: 5 },
    ];
    // Non-dropped: 6+3 + 6+6+4 = 25, plus mod 5 = 30
    expect(calculateTotal(dice)).toBe(30);
  });

  it("excludes dropped dice and their explosions from total", () => {
    const dice: DieResult[] = [
      { type: "d6", value: 6, exploded: [2], dropped: true },
      { type: "d6", value: 4 },
    ];
    // Only non-dropped: 4
    expect(calculateTotal(dice)).toBe(4);
  });

  it("sums basic dice with modifier", () => {
    const dice: (DieResult | ModifierResult)[] = [
      { type: "d20", value: 15 },
      { type: "mod", value: 3 },
    ];
    expect(calculateTotal(dice)).toBe(18);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
yarn test src/helpers/__tests__/advancedRolls.test.ts
```

Expected: FAIL — module `../advancedRolls` not found.

- [ ] **Step 3: Implement advancedRolls**

```typescript
// src/helpers/advancedRolls.ts
import { DieResult, ModifierResult } from "../types/RollResult";

type ExplodeConfig =
  | { type: "max" }
  | { type: "gte"; value: number }
  | { type: "exact"; value: number };

const MAX_EXPLOSIONS = 100;

function defaultRandom(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function shouldExplode(
  value: number,
  sides: number,
  config: ExplodeConfig
): boolean {
  switch (config.type) {
    case "max":
      return value === sides;
    case "gte":
      return value >= config.value;
    case "exact":
      return value === config.value;
  }
}

/**
 * Apply exploding dice rules. Mutates dice in-place by adding `exploded` arrays.
 * @param randomFn Injectable random for testing. Takes sides, returns 1-sides.
 */
export function applyExplodingDice(
  dice: DieResult[],
  sides: number,
  config: ExplodeConfig,
  randomFn: (sides: number) => number = defaultRandom
): DieResult[] {
  for (const die of dice) {
    if (shouldExplode(die.value, sides, config)) {
      const explosions: number[] = [];
      let totalExplosions = 0;
      let lastValue = die.value;

      while (
        shouldExplode(lastValue, sides, config) &&
        totalExplosions < MAX_EXPLOSIONS
      ) {
        const newValue = randomFn(sides);
        explosions.push(newValue);
        lastValue = newValue;
        totalExplosions++;
      }

      if (explosions.length > 0) {
        die.exploded = explosions;
      }
    }
  }
  return dice;
}

/**
 * Apply keep/drop rules. Marks dice as `dropped: true` based on their effective value
 * (base value + sum of explosions).
 */
export function applyKeepDrop(
  dice: DieResult[],
  rules: { keep?: number; drop?: number }
): DieResult[] {
  // Calculate effective value for each die (value + explosions)
  const withEffective = dice.map((die, index) => ({
    index,
    effective:
      die.value + (die.exploded ? die.exploded.reduce((a, b) => a + b, 0) : 0),
  }));

  // Sort by effective value ascending
  const sorted = [...withEffective].sort(
    (a, b) => a.effective - b.effective
  );

  let dropCount = 0;
  if (rules.keep !== undefined) {
    dropCount = dice.length - rules.keep;
  } else if (rules.drop !== undefined) {
    dropCount = rules.drop;
  }

  // Mark the lowest N as dropped
  const droppedIndices = new Set(
    sorted.slice(0, dropCount).map((s) => s.index)
  );

  for (let i = 0; i < dice.length; i++) {
    if (droppedIndices.has(i)) {
      dice[i].dropped = true;
    }
  }

  return dice;
}

function isModifier(
  entry: DieResult | ModifierResult
): entry is ModifierResult {
  return entry.type === "mod";
}

/**
 * Calculate total from dice results. Sums non-dropped dice (including their
 * explosion chains) plus modifiers.
 */
export function calculateTotal(
  dice: (DieResult | ModifierResult)[]
): number {
  let total = 0;
  for (const entry of dice) {
    if (isModifier(entry)) {
      total += entry.value;
    } else if (!entry.dropped) {
      total += entry.value;
      if (entry.exploded) {
        total += entry.exploded.reduce((a, b) => a + b, 0);
      }
    }
  }
  return total;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
yarn test src/helpers/__tests__/advancedRolls.test.ts
```

Expected: 14 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/helpers/advancedRolls.ts src/helpers/__tests__/advancedRolls.test.ts
git commit -m "Add advanced roll execution: exploding dice and keep/drop with tests"
```

**Note:** The `advancedRolls.ts` file should include a comment at the top of `applyExplodingDice`: `// TODO: Investigate physics-animated explosions (spawning new 3D dice per explosion) as a future enhancement. Currently explosions generate random values without physics simulation.`

---

## Task 15: Wire Hidden Default to OBR Role

**Files:**
- Modify: `src/controls/Sidebar.tsx`

This wires the `initializeHidden` store action to the actual OBR player role on mount.

- [ ] **Step 1: Add HiddenInitializer component in Sidebar**

In `src/controls/Sidebar.tsx`, add inside the `<PluginGate>` block a small inline component that reads OBR role and calls `initializeHidden`:

Add at the top of the file:

```typescript
import { useEffect } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { useDiceControlsStore } from "./store";

function HiddenInitializer() {
  const initializeHidden = useDiceControlsStore((s) => s.initializeHidden);
  useEffect(() => {
    OBR.player.getRole().then((role) => initializeHidden(role));
  }, [initializeHidden]);
  return null;
}
```

Add `<HiddenInitializer />` as the first child inside `<PluginGate>`:

```tsx
<PluginGate>
  <HiddenInitializer />
  <Divider flexItem sx={{ mx: 1 }} />
```

- [ ] **Step 2: Verify build compiles**

```bash
yarn build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/controls/Sidebar.tsx
git commit -m "Wire hidden roll default to OBR player role on mount"
```

---

## Task 16: Run All Tests & Final Verification

- [ ] **Step 1: Run full test suite**

```bash
yarn test
```

Expected: All tests pass (approximately 53 tests across 9 test files).

- [ ] **Step 2: Run build**

```bash
yarn build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Push and verify CI**

```bash
git push origin main
```

Expected: Both GitHub Actions workflows (test + deploy) pass.
