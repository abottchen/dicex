import { vi } from "vitest";
import { useDiceRollStore } from "../dice/store";
import { useDiceControlsStore } from "../controls/store";
import { DiceType } from "../types/DiceType";
import { DiceStyle } from "../types/DiceStyle";
import { DiceRoll } from "../types/DiceRoll";
import { Die } from "../types/Die";
import { Dice } from "../types/Dice";

// --- Asset mocks (must be before any store imports that trigger diceSets) ---

vi.mock("../previews/galaxy", () => ({ D20: "galaxy.png" }));
vi.mock("../previews/gemstone", () => ({ D20: "gemstone.png" }));
vi.mock("../previews/glass", () => ({ D20: "glass.png" }));
vi.mock("../previews/iron", () => ({ D20: "iron.png" }));
vi.mock("../previews/nebula", () => ({ D20: "nebula.png" }));
vi.mock("../previews/sunrise", () => ({ D20: "sunrise.png" }));
vi.mock("../previews/sunset", () => ({ D20: "sunset.png" }));
vi.mock("../previews/walnut", () => ({ D20: "walnut.png" }));
vi.mock("../previews/all.png", () => ({ default: "all.png" }));

// --- OBR Mock ---

export const obrCalls = {
  playerSetMetadata: [] as Record<string, unknown>[],
  roomSetMetadata: [] as Record<string, unknown>[],
};

export const obrConfig = {
  playerId: "player-1",
  playerName: "Gandalf",
  playerRole: "PLAYER" as "GM" | "PLAYER",
  partyPlayers: [
    { id: "gm-1", role: "GM", name: "DM", connectionId: "c1", metadata: {} },
  ] as any[],
  roomMetadata: {} as Record<string, unknown>,
};

vi.mock("@owlbear-rodeo/sdk", () => ({
  default: {
    player: {
      get id() { return obrConfig.playerId; },
      getName: vi.fn(() => Promise.resolve(obrConfig.playerName)),
      getRole: vi.fn(() => Promise.resolve(obrConfig.playerRole)),
      setMetadata: vi.fn((data: Record<string, unknown>) => {
        obrCalls.playerSetMetadata.push(data);
        return Promise.resolve();
      }),
    },
    room: {
      getMetadata: vi.fn(() => Promise.resolve({ ...obrConfig.roomMetadata })),
      setMetadata: vi.fn((data: Record<string, unknown>) => {
        Object.assign(obrConfig.roomMetadata, data);
        obrCalls.roomSetMetadata.push(data);
        return Promise.resolve();
      }),
    },
    party: {
      getPlayers: vi.fn(() => Promise.resolve([...obrConfig.partyPlayers])),
    },
    isAvailable: false,
    onReady: vi.fn((cb: () => void) => cb()),
  },
}));

// --- Store Helpers ---

export function resetStores() {
  useDiceRollStore.getState().clearRoll();
  useDiceControlsStore.setState({
    diceBonus: 0,
    diceAdvantage: null,
    diceHidden: false,
    activePresetName: null,
    activeNotation: null,
    activeNotationComponents: null,
  });
}

export function resetObrCalls() {
  obrCalls.playerSetMetadata.length = 0;
  obrCalls.roomSetMetadata.length = 0;
  obrConfig.roomMetadata = {};
  obrConfig.playerId = "player-1";
  obrConfig.playerName = "Gandalf";
  obrConfig.playerRole = "PLAYER";
  obrConfig.partyPlayers = [
    { id: "gm-1", role: "GM", name: "DM", connectionId: "c1", metadata: {} },
  ];
}

// --- Roll Simulation ---

let nextId = 1000;
function testDieId() {
  return `test-die-${nextId++}`;
}

export function createDie(type: DiceType, id?: string): Die {
  return { id: id ?? testDieId(), style: "IRON" as DiceStyle, type };
}

export interface SimulateRollConfig {
  dice: { type: DiceType; value: number }[];
  bonus?: number;
  hidden?: boolean;
  advantage?: "ADVANTAGE" | "DISADVANTAGE";
}

/**
 * Simulates a complete roll by calling startRoll and finishDieRoll for each die.
 * Returns the die IDs used.
 */
export function simulateRoll(config: SimulateRollConfig): string[] {
  const dies: Die[] = config.dice.map((d) => createDie(d.type));

  let rollDice: (Die | Dice)[];
  if (config.advantage) {
    const combination = config.advantage === "ADVANTAGE" ? "HIGHEST" : "LOWEST";
    // Group all dice into advantage structure
    rollDice = [];
    for (let i = 0; i < dies.length; i += 2) {
      if (i + 1 < dies.length) {
        rollDice.push({ dice: [dies[i], dies[i + 1]], combination } as Dice);
      } else {
        rollDice.push(dies[i]);
      }
    }
  } else {
    rollDice = dies;
  }

  const roll: DiceRoll = {
    dice: rollDice,
    bonus: config.bonus,
    hidden: config.hidden,
  };

  useDiceRollStore.getState().startRoll(roll);

  // startRoll regenerates IDs via getDieFromDice, so read current state
  const state = useDiceRollStore.getState();
  const currentIds = Object.keys(state.rollValues);
  const dummyTransform = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } };

  for (let i = 0; i < currentIds.length; i++) {
    useDiceRollStore.getState().finishDieRoll(
      currentIds[i],
      config.dice[i]?.value ?? 1,
      dummyTransform
    );
  }

  return currentIds;
}

export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
