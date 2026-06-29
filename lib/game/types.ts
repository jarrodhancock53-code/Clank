// Shared TypeScript types mirroring the Supabase schema + the jsonb
// `game_state` blob that holds everything not captured by dedicated columns.

export type GameStatus = "lobby" | "active" | "finished";
export type TurnPhase = "draw" | "play" | "refill" | "dragon_attack" | "next_turn" | "countdown" | "finished";

// Skill/Swords/Boots are an ephemeral per-turn pool, reset to 0 at the
// start of each turn. Gold is NOT part of this pool — it is applied
// directly to the player's permanent `gold` column the instant it is
// gained, since Gold persists across turns and counts toward score.
export interface ResourcePool {
  skill: number;
  swords: number;
  boots: number;
}

export interface RoomTokenState {
  artifactValue?: number; // remaining artifact token value in an artifact room (undefined once taken)
  majorSecret?: string; // id of major secret token still present, e.g. "chalice"
  minorSecret?: string; // id of minor secret token still present, e.g. "dragon_egg"
  monkeyIdols?: number; // remaining monkey idol count at monkey_shrine
}

export interface MarketState {
  crownAvailable: boolean;
  crownValue: 8 | 9 | 10;
  backpackAvailable: boolean;
  masterKeyAvailable: boolean;
}

export interface TurnFlags {
  hasMovedThisTurn: boolean;
  crystalCaveStop: boolean; // true once a player has entered a crystal cave this turn (no more boot movement)
  clankMadeThisTurn: number; // total positive clank generated this turn (for Swagger)
  archaeologistBonusAvailable: boolean; // may take an extra token on next room entry
  dragonScaleArmor: Record<string, boolean>; // playerId -> next dragon attack does 0 damage
  reactOpportunities: ReactOpportunity[]; // pending Assassin reacts
  pendingDiscard: { playerId: string } | null; // Wand of Recalling: must pick 1 card from hand to discard before any other action
}

export interface ReactOpportunity {
  id: string;
  playerId: string;
  monsterName: string;
  createdAt: number;
}

export interface GameState {
  rooms: Record<string, RoomTokenState>;
  market: MarketState;
  dungeonDeck: string[];
  dungeonDiscard: string[];
  clankArea: Record<string, number>; // playerId -> cubes staged in the clank area (not yet in bag)
  turnPool: ResourcePool;
  turnFlags: TurnFlags;
  turnActionLog: string[]; // human-readable actions logged so far this turn
  countdownPlayers: Record<string, number>; // playerId -> countdown track position (1-5)
  pendingDragonAttack?: { cubesToDraw: number; reason: string };
  lastDragonAttack?: DragonAttackResult;
  winners?: string[];
  inPlay: Record<string, string[]>; // playerId -> card instance ids played this turn (not yet discarded)
  teleportCharges: number; // remaining "ignore tunnel cost" moves available to the active player this turn
  reserveInstanceCounter: number; // monotonically increasing counter for minting unique reserve-card instance ids
  knockoutAboveGrassLine?: Record<string, boolean>;
}

export interface DragonAttackResult {
  cubesDrawn: string[]; // colors / "black"
  damageByPlayer: Record<string, number>;
  blackCount: number;
}

export interface GameRow {
  id: string;
  join_code: string;
  status: GameStatus;
  current_player_index: number;
  player_order: string[];
  game_state: GameState;
  turn_number: number;
  dragon_rage: number;
  countdown_track: number | null;
  first_escape_player_id: string | null;
  host_player_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArtifactHeld {
  roomId: string;
  value: number;
}

export interface PlayerRow {
  id: string;
  game_id: string;
  display_name: string;
  color: string;
  position: string;
  hand: string[];
  deck: string[];
  discard: string[];
  clank_cubes_in_supply: number;
  clank_cubes_on_board: number;
  health: number;
  gold: number;
  artifacts: ArtifactHeld[];
  tokens: string[]; // ids of secret/minor-secret/monkey-idol/market-item tokens held
  has_escaped: boolean;
  is_knocked_out: boolean;
  score: number;
  turn_order: number;
  is_host: boolean;
  last_seen_at: string;
  created_at: string;
}

export interface DungeonRowSlot {
  game_id: string;
  slot: number;
  card_id: string | null;
}

export interface TurnLogRow {
  id: string;
  game_id: string;
  player_id: string | null;
  turn_number: number;
  actions: string[];
  created_at: string;
}

export const MAX_HEALTH = 10;
export const STARTING_HEALTH = 10;
export const DRAGON_RAGE_DRAW_TABLE: Record<number, number> = {
  0: 1,
  1: 2,
  2: 3,
  3: 3,
  4: 4,
  5: 4,
  6: 5,
  7: 5,
  8: 6,
  9: 6,
};

export class GameActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameActionError";
  }
}
