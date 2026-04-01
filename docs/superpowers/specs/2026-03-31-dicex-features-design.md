# Dicex Features Design Spec

Three features for the Dicex fork of Owlbear Rodeo Dice: Rumble chat integration, roll audit logging, and preset/advanced notation support.

---

## Prerequisite: CI/CD & Testing Infrastructure

### GitHub Pages Deploy

GitHub Actions workflow at `.github/workflows/deploy.yml` that builds and deploys to GitHub Pages on push to `main`.

**Adjustments from reference (`obr-quick-store`):**
- Use `yarn` instead of `npm` (`yarn install --frozen-lockfile`, `yarn build`)
- Set Vite `base` config for GitHub Pages subpath (`/dicex/`)
- Update `public/manifest.json`:
  - `name`: `"Dicex"`
  - `author`: update to reflect fork
  - `homepage_url`: `"https://abottchen.github.io/dicex/"`
  - `action.title`: `"Dicex"`
  - `action.popover`, `action.icon`, `icon`, `background_url`: paths are relative and should work with Vite's `base` setting, but verify after deploy

### Vitest Setup

- Add `vitest` as a dev dependency
- Configure in `vite.config.ts` (Vitest integrates natively with Vite's existing config)
- Add scripts to `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`
- Add a CI workflow (`.github/workflows/test.yml`) that runs `yarn test` on push and PR

### GitHub Actions Test Workflow

Runs Vitest on every push and pull request to catch regressions before deploy.

---

## Feature 1: Rumble Chat Integration

### Purpose

Post formatted roll results to Rumble's chat window so Dicex replaces Rumble's built-in roller while keeping the chat log as the single source of roll history visible to all players.

### Component: `RumbleSync`

A logic-only React component mounted in the plugin provider tree alongside `DiceRollSync`. Renders nothing.

**Behavior:**
1. Subscribes to `useDiceRollStore` — watches for roll completion (all dice values finalized)
2. Only fires for the local player's own rolls (not synced remote rolls)
3. On completion, formats a message and writes to OBR player metadata:

```js
metadata['com.battle-system.friends/metadata_chatlog'] = {
  chatlog: 'Gandalf rolled (2d6 → [3-3]) for 6!',
  created: new Date().toISOString(),
  sender: 'Dicex',
  targetId: '0000' // normal roll: entire party
}

// Hidden rolls send two messages:
// 1. To the roller: targetId = playerObrId
// 2. To the GM: targetId = gmObrId
// Exception: if the roller IS the GM, send only one message (to themselves)
```

### Hidden Roll Default

- **GM:** Hidden mode defaults to ON. The GM can toggle it off for any roll.
- **Players:** Hidden mode defaults to OFF (current behavior). Players can toggle it on.

This is a change to the existing `useDiceControlsStore` hidden state initialization — it must check the player's OBR role at mount time.

### Message Format

**Freehand rolls:**
- Basic: `{name} rolled (2d6 → [3-3]) for 6!`
- With bonus: `{name} rolled (1d20 → [12] +13) for 25!`
- Mixed dice: `{name} rolled (2d6 → [3-3], 1d20 → [4]) for 10!`
- Advantage: `{name} rolled (2d20 → [15-4] adv) for 15!`
- Disadvantage: `{name} rolled (2d20 → [15-4] dis) for 4!`

**From presets:**
- `{name} used [Fireball] and rolled (6d8 → [8-3-6-3-2-5]) for 27!`
- `{name} used [Attack] and rolled (1d20 → [12] +7) for 19!`

**Advanced rolls (exploding, keep/drop):**
- Exploding: `{name} used [Chaos Bolt] and rolled (3d6! → [6-4-3-6-2]) for 21!` (explosion results inline)
- Keep: `{name} used [Stats] and rolled (4d6k3 → [6-5-4-~~2~~]) for 15!` (dropped dice struck through)

**Formatting rules:**
- Dice of the same type grouped: `3d6 → [2-5-1]`
- Different types comma-separated: `2d6 → [3-3], 1d20 → [4]`
- Bonus shown inline after die results: `[12] +13`
- Normal rolls use `targetId: '0000'` (entire party)
- Hidden rolls send two messages: one to the roller (`targetId: playerObrId`) and one to the GM (`targetId: gmObrId`). If the roller is the GM, only one message is sent (to themselves)

### Formatting Utility

A standalone function that takes roll results and produces the message string. Inputs:
- Player name
- Array of die results (type, value, dropped, exploded)
- Bonus modifier
- Advantage/disadvantage mode
- Preset name (optional)

---

## Feature 2: Roll Audit Log

### Purpose

Store all roll data from every player for offline analytics — roll distributions, epic successes/failures, per-player stats.

### Data Storage

Room metadata with per-player keys to avoid write conflicts:

```
com.dicex/roll-log/{player-obr-id}
```

### Data Model

```js
{
  name: 'Gandalf',
  rolls: [
    // Basic roll
    {
      timestamp: '2026-03-30T22:15:00.000Z',
      notation: '1d20',
      dice: [
        { type: 'd20', value: 15 }
      ],
      total: 15
    },

    // Roll with modifier
    {
      timestamp: '2026-03-30T22:16:00.000Z',
      notation: '3d4+3',
      dice: [
        { type: 'd4', value: 2 },
        { type: 'd4', value: 4 },
        { type: 'd4', value: 1 },
        { type: 'mod', value: 3 }
      ],
      total: 10
    },

    // Advantage roll
    {
      timestamp: '2026-03-30T22:17:00.000Z',
      notation: '2d20',
      advantage: 'adv',
      dice: [
        { type: 'd20', value: 15 },
        { type: 'd20', value: 4 }
      ],
      total: 15
    },

    // Exploding dice: 3d6! rolls [6, 3, 6], 6s explode into [4] and [2]
    {
      timestamp: '2026-03-30T22:18:00.000Z',
      notation: '3d6!',
      preset: 'Chaos Bolt',
      dice: [
        { type: 'd6', value: 6, exploded: [4] },
        { type: 'd6', value: 3 },
        { type: 'd6', value: 6, exploded: [2] }
      ],
      total: 21
    },

    // Keep highest: 4d6k3 rolls [5, 2, 4, 6], drops the 2
    {
      timestamp: '2026-03-30T22:19:00.000Z',
      notation: '4d6k3',
      preset: 'Stat Roll',
      dice: [
        { type: 'd6', value: 5 },
        { type: 'd6', value: 2, dropped: true },
        { type: 'd6', value: 4 },
        { type: 'd6', value: 6 }
      ],
      total: 15
    },

    // Drop lowest: 8d100d3 rolls [84, 12, 55, 7, 91, 3, 67, 45], drops 3 lowest
    {
      timestamp: '2026-03-30T22:20:00.000Z',
      notation: '8d100d3',
      dice: [
        { type: 'd100', value: 84 },
        { type: 'd100', value: 12, dropped: true },
        { type: 'd100', value: 55 },
        { type: 'd100', value: 7, dropped: true },
        { type: 'd100', value: 91 },
        { type: 'd100', value: 3, dropped: true },
        { type: 'd100', value: 67 },
        { type: 'd100', value: 45 }
      ],
      total: 342
    },

    // Exploding + keep: 3d6!k2 — explode first, then keep highest 2
    {
      timestamp: '2026-03-30T22:21:00.000Z',
      notation: '3d6!k2',
      dice: [
        { type: 'd6', value: 6, exploded: [3] },
        { type: 'd6', value: 2, dropped: true },
        { type: 'd6', value: 6, exploded: [6, 4] }
      ],
      total: 25
    },

    // Roll from a preset
    {
      timestamp: '2026-03-30T22:22:00.000Z',
      notation: '6d8+3',
      preset: 'Fireball',
      dice: [
        { type: 'd8', value: 8 },
        { type: 'd8', value: 3 },
        { type: 'd8', value: 6 },
        { type: 'd8', value: 3 },
        { type: 'd8', value: 2 },
        { type: 'd8', value: 5 },
        { type: 'mod', value: 3 }
      ],
      total: 30
    }
  ]
}
```

### Audit Log Field Reference

**Roll entry fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | string (ISO 8601 UTC) | yes | When the roll occurred |
| `notation` | string | yes | Original dice notation (e.g. `2d6+3`, `4d6k3`, `3d6!`) |
| `dice` | array | yes | Individual die results |
| `total` | number | yes | Final calculated total (after modifiers, keep/drop, explosions) |
| `advantage` | `'adv'` \| `'dis'` | no | Present only for advantage/disadvantage rolls |
| `preset` | string | no | Preset name, if the roll originated from a preset |

**Dice entry fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | Die type (`'d4'`, `'d6'`, `'d8'`, `'d10'`, `'d12'`, `'d20'`, `'d100'`, `'mod'`) |
| `value` | number | yes | Rolled value, or modifier amount for `type: 'mod'` |
| `dropped` | boolean | no | `true` if this die was excluded by keep/drop rules |
| `exploded` | number[] | no | Chain of additional values from explosions. Each entry is one reroll. If an explosion itself exploded, the chain continues (e.g. `[6, 6, 3]` means exploded twice then stopped) |

### Component: `RollLogger`

Logic-only React component, mounted in the plugin provider tree.

**Behavior:**
1. On roll completion, reads current room metadata at `com.dicex/roll-log/{player-id}`
2. Constructs the roll entry from store state
3. Appends to the player's rolls array
4. Writes back with `OBR.room.setMetadata()`
5. Fires for local rolls only (each client logs its own)

**Concurrency:** Per-player keys eliminate write conflicts between simultaneous rolls from different players.

### GM Controls

Two buttons in the sidebar, visible only when `OBR.player.getRole() === 'GM'`:

1. **Download Rolls** — reads all `com.dicex/roll-log/*` keys, combines into a single JSON object, triggers browser file download as `dicex-rolls-YYYY-MM-DD.json`
2. **Download & Clear** — same download, then clears all `com.dicex/roll-log/*` keys

Placed at the bottom of the sidebar with distinct icons (download vs download+trash).

---

## Feature 3: Presets & Advanced Notation

### Purpose

Allow players to save named dice configurations and support advanced roll mechanics (exploding dice, keep/drop) through typed notation in presets.

### Preset Data Storage

Room metadata with per-player keys:

```
com.dicex/presets/{player-obr-id}
```

```js
{
  presets: [
    {
      id: 'uuid-1',
      name: 'Fireball',
      notation: '6d8+3'
    },
    {
      id: 'uuid-2',
      name: 'Attack (Advantage)',
      notation: '2d20k1+7'
    },
    {
      id: 'uuid-3',
      name: 'Chaos Bolt',
      notation: '2d8!+1d6'
    }
  ]
}
```

No hard cap on preset count.

### Notation Parser

Parses dice notation strings into structured roll definitions.

**Supported syntax:**
- Basic: `2d6`, `1d20+3`, `2d6+1d8+5`
- Exploding: `3d6!`, `3d6!>4`, `3d6!3`
- Keep highest: `4d6k3`
- Drop lowest: `8d100d3`
- Combinations: `2d6!+1d20k1+5`
- Optional whitespace between terms

**Valid die types:** d4, d6, d8, d10, d12, d20, d100

**Output:** Array of roll components:
```js
[
  { count: 3, sides: 6, explode: { type: 'max' } },           // 3d6!
  { count: 3, sides: 6, explode: { type: 'gte', value: 4 } }, // 3d6!>4
  { count: 3, sides: 6, explode: { type: 'exact', value: 3 }},// 3d6!3
  { count: 4, sides: 6, keep: 3 },                             // 4d6k3
  { count: 8, sides: 100, drop: 3 },                           // 8d100d3
  { modifier: 5 }                                               // +5
]
```

**Validation:** Returns errors for unrecognized die types, malformed syntax, keep/drop counts exceeding dice count. Invalid notation highlighted in the edit UI and blocked from saving.

### Save Flow UI

A small, subtle save icon (bookmark/pin) near the roll button area. Only enabled when dice are selected but not yet rolled.

**On click:**
1. Modal/panel appears showing:
   - Auto-generated notation from current dice selection (e.g. `2d6+1d8+3`)
   - Text field for preset name
   - List of existing presets for reference
   - Save button at the bottom
2. Saving dismisses the panel and writes to `com.dicex/presets/{player-id}`

### Load Flow UI

A "Presets" button in the sidebar below "Fairness". Expands a dropdown panel (same interaction pattern as the dice set picker).

**Panel contents:**
- Scrollable list of saved presets, each showing name and notation
- Clicking a preset populates the dice controls
- An "Edit" button at the bottom

**For basic notation** (maps to standard dice): populates the dice count, bonus, and advantage controls as if the player clicked them manually. Player presses "Roll" as usual.

**For advanced notation** (exploding, keep/drop): the roll executes through a separate code path when "Roll" is pressed (see Advanced Roll Execution below).

### Edit Flow UI

Edit button in the presets dropdown opens a modal with all presets listed. Each row:
- Editable name text field
- Editable notation text field (validated live, highlighted red if invalid)
- Delete trash icon

Save button at the bottom commits all changes. Invalid entries block saving.

### Advanced Roll Execution

For presets with notation that includes exploding dice or keep/drop:

1. Parse notation into structured components
2. Roll all physical dice through the existing Rapier simulation
3. After physics settles, apply post-roll rules:
   - **Exploding:** Check for values meeting the explode threshold. Generate additional random values (no physics animation). Chain until no explosion or 100-reroll cap hit
   - **Keep:** Sort results, mark all but the top N as dropped
   - **Drop:** Sort results, mark the bottom N as dropped
4. Calculate total from kept dice (including explosion values) + modifiers
5. Feed results to Rumble chat (Feature 1) and roll audit log (Feature 2)

**TODO:** Investigate physics-animated explosions (spawning new 3D dice for each explosion reroll) as a future enhancement.

---

## Shared Infrastructure

### OBR Metadata Keys

| Key Pattern | Scope | Purpose |
|-------------|-------|---------|
| `com.battle-system.friends/metadata_chatlog` | Player | Rumble chat messages |
| `com.dicex/roll-log/{player-id}` | Room | Roll audit log per player |
| `com.dicex/presets/{player-id}` | Room | Saved presets per player |

### Component Mount Order

All three logic components mount in the plugin provider tree:
- `RumbleSync` — posts to Rumble chat
- `RollLogger` — appends to audit log
- `RumbleSync` and `RollLogger` both consume roll completion events from `useDiceRollStore`

### Roll Completion as Shared Event

Both `RumbleSync` and `RollLogger` need to detect when a roll is finalized. This should be a single subscription pattern (store selector or event) rather than duplicated detection logic.

---

## Testing Strategy

All features use TDD with Vitest. Tests are written first and must fail before implementation begins.

### Setup

Add Vitest as a dev dependency. Configure via `vite.config.ts` (Vitest integrates natively with Vite). Add `yarn test` and `yarn test:watch` scripts to `package.json`.

OBR SDK calls must be mocked in all tests — the test environment has no Owlbear Rodeo runtime.

### Feature 0: Hidden Roll Default

Tests in `src/controls/__tests__/hiddenDefault.test.ts`:
- GM role initializes hidden state to `true`
- Player role initializes hidden state to `false`
- GM can toggle hidden to `false`
- Player can toggle hidden to `true`

### Feature 1: Rumble Chat Integration

**Message formatter** tests in `src/plugin/__tests__/formatRumbleMessage.test.ts`:
- Basic roll: `2d6` with values [3, 3] → `'{name} rolled (2d6 → [3-3]) for 6!'`
- With bonus: `1d20` value [12] bonus +13 → `'{name} rolled (1d20 → [12] +13) for 25!'`
- Mixed dice: `2d6` [3, 3] + `1d20` [4] → `'{name} rolled (2d6 → [3-3], 1d20 → [4]) for 10!'`
- Advantage: `2d20` [15, 4] adv → `'{name} rolled (2d20 → [15-4] adv) for 15!'`
- Disadvantage: `2d20` [15, 4] dis → `'{name} rolled (2d20 → [15-4] dis) for 4!'`
- Preset roll: name "Fireball", `6d8` [8,3,6,3,2,5] → `'{name} used [Fireball] and rolled (6d8 → [8-3-6-3-2-5]) for 27!'`
- Preset with bonus: name "Attack", `1d20` [12] bonus +7 → `'{name} used [Attack] and rolled (1d20 → [12] +7) for 19!'`
- Exploding dice: `3d6!` with values [6, 3, 6] and explosions [4] and [2] → includes all values inline
- Keep/drop: `4d6k3` [5, 2, 4, 6] with die 2 dropped → struck-through dropped die

**Target routing** tests in `src/plugin/__tests__/rumbleTargeting.test.ts`:
- Normal roll → `targetId: '0000'`
- Hidden roll by player → two messages: one to `playerObrId`, one to `gmObrId`
- Hidden roll by GM → one message to `gmObrId` only (no duplicate)

### Feature 2: Roll Audit Log

**Roll entry builder** tests in `src/plugin/__tests__/buildRollEntry.test.ts`:
- Basic roll: 1d20 value 15 → `{ notation: '1d20', dice: [{ type: 'd20', value: 15 }], total: 15 }`
- With modifier: 3d4+3 values [2, 4, 1] → includes `{ type: 'mod', value: 3 }`, total 10
- Advantage roll: 2d20 [15, 4] adv → `advantage: 'adv'`, total 15
- Disadvantage roll: 2d20 [15, 4] dis → `advantage: 'dis'`, total 4
- Exploding dice: 3d6! [6, 3, 6] explosions [4], [2] → `exploded` arrays on correct dice, total 21
- Keep: 4d6k3 [5, 2, 4, 6] → die with value 2 has `dropped: true`, total 15
- Drop: 8d100d3 [84, 12, 55, 7, 91, 3, 67, 45] → 3 lowest have `dropped: true`, total 342
- Exploding + keep: 3d6!k2 → explode first, then mark dropped, correct total
- Preset roll: includes `preset` field in entry
- Timestamp is valid ISO 8601 UTC string
- Notation field preserved from original input

**Download/export** tests in `src/plugin/__tests__/rollLogExport.test.ts`:
- Combines multiple players' logs into single JSON structure
- JSON contains all fields from the data model
- Clear operation resets all player log keys

### Feature 3a: Presets with Basic Notation

**Notation parser** tests in `src/helpers/__tests__/notationParser.test.ts`:
- `'2d6'` → `[{ count: 2, sides: 6 }]`
- `'1d20+3'` → `[{ count: 1, sides: 20 }, { modifier: 3 }]`
- `'2d6+1d8+5'` → three components
- `'2d6 + 1d8 + 5'` → same result (whitespace tolerance)
- `'3d6!'` → `[{ count: 3, sides: 6, explode: { type: 'max' } }]`
- `'3d6!>4'` → `explode: { type: 'gte', value: 4 }`
- `'3d6!3'` → `explode: { type: 'exact', value: 3 }`
- `'4d6k3'` → `[{ count: 4, sides: 6, keep: 3 }]`
- `'8d100d3'` → `[{ count: 8, sides: 100, drop: 3 }]`
- `'2d6!+1d20k1+5'` → three components with correct modifiers
- Invalid die type `'2d7'` → error
- Keep count exceeding dice count `'2d6k3'` → error
- Drop count exceeding dice count `'2d6d3'` → error
- Empty string → error
- Malformed syntax `'ddd'` → error

**Notation serializer** tests in `src/helpers/__tests__/notationSerializer.test.ts`:
- Converts dice controls state (counts, bonus, advantage) to notation string
- `{d6: 2, bonus: 0}` → `'2d6'`
- `{d20: 1, bonus: 5}` → `'1d20+5'`
- `{d6: 2, d8: 1, bonus: 3}` → `'2d6+1d8+3'`
- Round-trips: serialize then parse produces equivalent structure

**Preset CRUD** tests in `src/plugin/__tests__/presetStorage.test.ts`:
- Save preset writes to `com.dicex/presets/{player-id}`
- Load presets reads correct key
- Delete preset removes by ID
- Update preset modifies name and notation by ID
- Validation rejects invalid notation before saving

### Feature 3b: Advanced Roll Execution

**Exploding dice** tests in `src/helpers/__tests__/advancedRolls.test.ts`:
- Explode on max: d6 rolling 6 triggers reroll
- Explode on max: d6 rolling 5 does not trigger reroll
- Explode chain: d6 rolling 6 then 6 then 3 → exploded array `[6, 3]`
- Explode with threshold `!>4`: d6 rolling 4 triggers reroll
- Explode with threshold `!>4`: d6 rolling 3 does not trigger
- Explode with exact `!3`: d6 rolling 3 triggers, rolling 4 does not
- Explosion cap: stops at 100 rerolls
- Total includes all explosion values

**Keep/drop** tests in `src/helpers/__tests__/advancedRolls.test.ts`:
- Keep 3 from 4d6 [5, 2, 4, 6] → value 2 dropped, total 15
- Drop 3 from 8d100 [84, 12, 55, 7, 91, 3, 67, 45] → 3 lowest dropped, total 342
- Keep 1 from 2d20 (advantage equivalent) → lower dropped
- Explode then keep: explosions happen first, then keep/drop applies to effective totals per die

**Total calculation** tests in `src/helpers/__tests__/advancedRolls.test.ts`:
- Total sums only non-dropped dice + their explosions + modifiers
- Dropped dice and their explosions excluded from total
