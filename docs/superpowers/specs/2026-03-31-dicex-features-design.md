# Dicex Features Design Spec

Three features for the Dicex fork of Owlbear Rodeo Dice: Rumble chat integration, roll audit logging, and preset/advanced notation support.

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
  targetId: hidden ? playerObrId : '0000'
}
```

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
- Hidden rolls use the player's own OBR ID as `targetId`; normal rolls use `'0000'`

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
