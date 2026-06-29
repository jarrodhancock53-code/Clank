import { ROOM_BY_ID, getTunnel } from "./board";
import {
  CARD_BY_ID,
  buildDungeonDeck,
  buildStartingDeck,
  getCardDef,
  instanceCardId,
  shuffle,
} from "./cards";
import { buildInitialDragonBag, cubesToDrawForRage, describeDragonAttack, executeDragonAttack } from "./dragonBag";
import { addClankToArea, applyCardResources, resolveEffect, spendPool } from "./effects";
import { GameActionError, GameRow, GameState, MAX_HEALTH, PlayerRow, ResourcePool } from "./types";

const DRAGON_MARKER = "__DRAGON_MARKER__";
const HAND_SIZE = 5;

export interface EngineContext {
  game: GameRow;
  players: PlayerRow[];
  dungeonRow: (string | null)[]; // length 6, slot index = array index
  dragonBag: string[]; // mutated in place as cubes are drawn during this action
}

function emptyTurnFlags() {
  return {
    hasMovedThisTurn: false,
    crystalCaveStop: false,
    clankMadeThisTurn: 0,
    archaeologistBonusAvailable: false,
    dragonScaleArmor: {} as Record<string, boolean>,
    reactOpportunities: [],
    pendingDiscard: null,
  };
}

function emptyPool(): ResourcePool {
  return { skill: 0, swords: 0, boots: 0 };
}

// =========================================================
// GAME INITIALIZATION
// =========================================================

const MAJOR_SECRET_NAMES = [
  "chalice",
  "crown_jewel",
  "ancient_relic",
  "sacred_scroll",
  "golden_idol",
  "silver_chalice",
  "jeweled_dagger",
  "royal_seal",
  "ancient_coin",
];
const MINOR_SECRET_NAMES = [
  "dragon_egg",
  "gem_pouch",
  "ancient_coin_stack",
  "rune_stone",
  "torch",
  "skull",
  "vial",
  "scroll_fragment",
  "bone_key",
];

function buildDungeonDeckWithMarkers(): string[] {
  const deck = shuffle(buildDungeonDeck());
  const markerCount = Math.max(4, Math.round(deck.length / 12));
  const withMarkers = [...deck];
  for (let i = 0; i < markerCount; i++) {
    const insertAt = Math.floor(Math.random() * (withMarkers.length + 1));
    withMarkers.splice(insertAt, 0, DRAGON_MARKER);
  }
  return withMarkers;
}

export function initializeGame(players: PlayerRow[]): { gameState: GameState; dungeonRow: (string | null)[]; dragonBagCubes: string[] } {
  const rooms: GameState["rooms"] = {};
  for (const room of Object.values(ROOM_BY_ID)) {
    if (room.type === "artifact") rooms[room.id] = { artifactValue: room.artifactValue };
    else if (room.type === "monkey_shrine") rooms[room.id] = { monkeyIdols: 3 };
    else rooms[room.id] = {};
  }
  const secretRoomIds = Object.values(ROOM_BY_ID).filter((r) => r.type === "secret").map((r) => r.id);
  const minorSecretRoomIds = Object.values(ROOM_BY_ID).filter((r) => r.type === "minor_secret").map((r) => r.id);
  secretRoomIds.forEach((id, i) => {
    rooms[id].majorSecret = MAJOR_SECRET_NAMES[i % MAJOR_SECRET_NAMES.length];
  });
  minorSecretRoomIds.forEach((id, i) => {
    rooms[id].minorSecret = MINOR_SECRET_NAMES[i % MINOR_SECRET_NAMES.length];
  });

  const dungeonDeck = buildDungeonDeckWithMarkers();
  const dungeonRow: (string | null)[] = [];
  let dragonTriggersDuringSetup = 0;
  while (dungeonRow.length < 6 && dungeonDeck.length > 0) {
    const next = dungeonDeck.shift()!;
    if (next === DRAGON_MARKER) {
      dragonTriggersDuringSetup++;
      continue;
    }
    dungeonRow.push(next);
  }
  while (dungeonRow.length < 6) dungeonRow.push(null);

  const crownValues: Array<8 | 9 | 10> = [8, 9, 10];
  const crownValue = crownValues[Math.floor(Math.random() * crownValues.length)];

  const gameState: GameState = {
    rooms,
    market: {
      crownAvailable: true,
      crownValue,
      backpackAvailable: true,
      masterKeyAvailable: true,
    },
    dungeonDeck,
    dungeonDiscard: [],
    clankArea: {},
    turnPool: emptyPool(),
    turnFlags: emptyTurnFlags(),
    turnActionLog: [],
    countdownPlayers: {},
    inPlay: {},
    teleportCharges: 0,
    reserveInstanceCounter: 0,
    knockoutAboveGrassLine: {},
  };
  // (dragon triggers seen while dealing the initial row are ignored —
  // the dragon hasn't started threatening players before turn 1.)
  void dragonTriggersDuringSetup;

  for (const player of players) {
    player.deck = shuffle(buildStartingDeck());
    player.hand = [];
    player.discard = [];
    player.position = "entrance";
    player.health = MAX_HEALTH;
    player.gold = 0;
    player.artifacts = [];
    player.tokens = [];
    player.has_escaped = false;
    player.is_knocked_out = false;
    player.score = 0;
    player.clank_cubes_in_supply = 26;
    player.clank_cubes_on_board = 0;
    gameState.clankArea[player.id] = 0;
    gameState.inPlay[player.id] = [];
    drawCards(player, HAND_SIZE);
  }

  return { gameState, dungeonRow, dragonBagCubes: buildInitialDragonBag() };
}

function drawCards(player: PlayerRow, count: number): string[] {
  const drawn: string[] = [];
  for (let i = 0; i < count; i++) {
    if (player.deck.length === 0) {
      if (player.discard.length === 0) break;
      player.deck = shuffle(player.discard);
      player.discard = [];
    }
    const c = player.deck.shift();
    if (c) {
      player.hand.push(c);
      drawn.push(c);
    }
  }
  return drawn;
}

// =========================================================
// HELPERS
// =========================================================

function requireActivePlayer(ctx: EngineContext, playerId: string): PlayerRow {
  if (ctx.game.status !== "active") throw new GameActionError("Game is not active.");
  const currentId = ctx.game.player_order[ctx.game.current_player_index];
  if (currentId !== playerId) throw new GameActionError("It is not your turn.");
  const player = ctx.players.find((p) => p.id === playerId);
  if (!player) throw new GameActionError("Player not found in this game.");
  if (player.is_knocked_out || player.has_escaped) throw new GameActionError("You are no longer active in the dungeon.");
  const pendingDiscard = ctx.game.game_state.turnFlags.pendingDiscard;
  if (pendingDiscard && pendingDiscard.playerId === playerId) {
    throw new GameActionError("You must choose a card to discard from Wand of Recalling first.");
  }
  return player;
}

function drawDungeonCards(gameState: GameState, count: number): { cards: string[]; dragonTriggers: number } {
  const cards: string[] = [];
  let dragonTriggers = 0;
  let safety = 0;
  while (cards.length < count && safety < 1000) {
    safety++;
    if (gameState.dungeonDeck.length === 0) {
      if (gameState.dungeonDiscard.length === 0) break;
      gameState.dungeonDeck = shuffle(gameState.dungeonDiscard);
      gameState.dungeonDiscard = [];
    }
    const next = gameState.dungeonDeck.shift();
    if (!next) break;
    if (next === DRAGON_MARKER) {
      dragonTriggers++;
      continue;
    }
    cards.push(next);
  }
  return { cards, dragonTriggers };
}

function ownsCard(player: PlayerRow, baseId: string): boolean {
  const all = [...player.deck, ...player.discard, ...player.hand];
  return all.some((id) => getCardDef(id).id === baseId);
}

function applyArriveEffects(cardInstanceId: string, ctx: EngineContext, log: string[]) {
  const def = getCardDef(cardInstanceId);
  if (def.arriveEffect === "all_players_plus_1_clank") {
    for (const p of ctx.players) {
      ctx.game.game_state.clankArea[p.id] = (ctx.game.game_state.clankArea[p.id] || 0) + 1;
    }
    log.push(`${def.name} arrived in the Dungeon Row — all players gain 1 Clank.`);
  }
  if (def.type === "monster") {
    for (const p of ctx.players) {
      if (ownsCard(p, "assassin") && p.hand.length > 0) {
        ctx.game.game_state.turnFlags.reactOpportunities.push({
          id: `${cardInstanceId}_${p.id}_${Date.now()}`,
          playerId: p.id,
          monsterName: def.name,
          createdAt: Date.now(),
        });
      }
    }
  }
}

/**
 * Resolves an Assassin REACT: any player holding an Assassin may
 * immediately play one card from their hand the instant a monster
 * arrives in the Dungeon Row, even outside their turn. Skill/Boot/Sword
 * resources generated have no in-turn pool to join (it isn't their
 * turn), so only the immediate, persistent effects are applied: Gold,
 * Clank, and card draw/heal/trash effects. The card is then discarded.
 */
export function reactPlay(ctx: EngineContext, playerId: string, opportunityId: string, cardInstanceId: string): string[] {
  const gameState = ctx.game.game_state;
  const oppIdx = gameState.turnFlags.reactOpportunities.findIndex((o) => o.id === opportunityId && o.playerId === playerId);
  if (oppIdx === -1) throw new GameActionError("That react window has passed.");
  const opportunity = gameState.turnFlags.reactOpportunities[oppIdx];
  const player = ctx.players.find((p) => p.id === playerId);
  if (!player) throw new GameActionError("Player not found.");
  if (!player.hand.includes(cardInstanceId)) throw new GameActionError("That card is not in your hand.");

  const def = getCardDef(cardInstanceId);
  const idx = player.hand.indexOf(cardInstanceId);
  player.hand.splice(idx, 1);
  player.discard.push(cardInstanceId);

  const log: string[] = [];
  if (def.resources.gold) player.gold += def.resources.gold;
  if (def.resources.clank) addClankToArea(gameState, player.id, def.resources.clank);

  const dummyPool: ResourcePool = emptyPool();
  const effectCtx = { player, players: ctx.players, gameState, pool: dummyPool, log };
  for (const effect of def.effects) {
    if (["heal_1", "heal_3", "draw_1", "trash_1_from_hand", "trash_1_from_discard"].includes(effect)) {
      resolveEffect(effect, cardInstanceId, effectCtx);
    }
  }

  log.push(`${player.display_name} reacted to ${opportunity.monsterName} with Assassin, playing ${def.name} from hand.`);
  gameState.turnFlags.reactOpportunities.splice(oppIdx, 1);
  return log;
}

export function declineReact(ctx: EngineContext, playerId: string, opportunityId: string): string[] {
  const gameState = ctx.game.game_state;
  const oppIdx = gameState.turnFlags.reactOpportunities.findIndex((o) => o.id === opportunityId && o.playerId === playerId);
  if (oppIdx === -1) throw new GameActionError("That react window has passed.");
  gameState.turnFlags.reactOpportunities.splice(oppIdx, 1);
  return [];
}

function dangerCardCountInRow(dungeonRow: (string | null)[]): number {
  return dungeonRow.filter((id) => id && getCardDef(id).isDanger).length;
}

function runDragonAttack(ctx: EngineContext, reason: string, bonusCubes: number, log: string[]): void {
  ctx.game.dragon_rage = Math.min(9, ctx.game.dragon_rage + 1);
  const baseCubes = cubesToDrawForRage(ctx.game.dragon_rage);
  const danger = dangerCardCountInRow(ctx.dungeonRow);
  const cubesToDraw = baseCubes + danger + bonusCubes;

  const { newBag, result } = executeDragonAttack(ctx.dragonBag, ctx.game.game_state.clankArea, ctx.players, cubesToDraw);
  ctx.dragonBag.length = 0;
  ctx.dragonBag.push(...newBag);

  for (const p of ctx.players) ctx.game.game_state.clankArea[p.id] = 0;

  for (const [playerId, dmg] of Object.entries(result.damageByPlayer)) {
    const player = ctx.players.find((p) => p.id === playerId);
    if (!player) continue;
    if (ctx.game.game_state.turnFlags.dragonScaleArmor[playerId]) {
      ctx.game.game_state.turnFlags.dragonScaleArmor[playerId] = false;
      log.push(`${player.display_name} was shielded from the Dragon Attack by Dragon Scale Armor.`);
      continue;
    }
    applyDamage(player, dmg, ctx.game.game_state);
  }

  ctx.game.game_state.lastDragonAttack = result;
  log.push(describeDragonAttack(result, ctx.players) + (reason ? ` (${reason})` : ""));
}

function applyDamage(player: PlayerRow, amount: number, gameState: GameState) {
  player.health = Math.max(0, player.health - amount);
  if (player.health <= 0 && !player.is_knocked_out && !player.has_escaped) {
    player.is_knocked_out = true;
    const room = ROOM_BY_ID[player.position];
    gameState.knockoutAboveGrassLine = gameState.knockoutAboveGrassLine || {};
    gameState.knockoutAboveGrassLine[player.id] = room ? !room.belowGrassLine : false;
  }
}

// =========================================================
// PLAY CARD
// =========================================================
export function playCard(ctx: EngineContext, playerId: string, cardInstanceId: string, choices?: Record<string, any>): string[] {
  const player = requireActivePlayer(ctx, playerId);
  const log: string[] = [];
  if (!player.hand.includes(cardInstanceId)) throw new GameActionError("That card is not in your hand.");

  const def = getCardDef(cardInstanceId);
  const idx = player.hand.indexOf(cardInstanceId);
  player.hand.splice(idx, 1);
  ctx.game.game_state.inPlay[playerId] = ctx.game.game_state.inPlay[playerId] || [];
  ctx.game.game_state.inPlay[playerId].push(cardInstanceId);

  applyCardResources(def, ctx.game.game_state.turnPool, ctx.game.game_state, player);

  const effectCtx = { player, players: ctx.players, gameState: ctx.game.game_state, pool: ctx.game.game_state.turnPool, log, choices };
  for (const effect of def.effects) {
    resolveEffect(effect, cardInstanceId, effectCtx);
  }

  const resourceParts: string[] = [];
  if (def.resources.skill) resourceParts.push(`+${def.resources.skill} Skill`);
  if (def.resources.swords) resourceParts.push(`+${def.resources.swords} Swords`);
  if (def.resources.boots) resourceParts.push(`+${def.resources.boots} Boots`);
  if (def.resources.gold) resourceParts.push(`+${def.resources.gold} Gold`);
  if (def.resources.clank) resourceParts.push(`${def.resources.clank > 0 ? "+" : ""}${def.resources.clank} Clank`);
  log.push(`Played ${def.name}${resourceParts.length ? ` (${resourceParts.join(", ")})` : ""}.`);

  return log;
}

/**
 * Resolves the Wand of Recalling's mandatory discard (set as a pending
 * flag by the draw_2_discard_1 effect when no choice was supplied
 * up front, since the drawn cards aren't known to the client until
 * after the draw happens server-side).
 */
export function resolvePendingDiscard(ctx: EngineContext, playerId: string, discardCardId: string): string[] {
  const gameState = ctx.game.game_state;
  const pending = gameState.turnFlags.pendingDiscard;
  if (!pending || pending.playerId !== playerId) throw new GameActionError("There is no pending discard to resolve.");
  const player = ctx.players.find((p) => p.id === playerId);
  if (!player) throw new GameActionError("Player not found.");
  if (!player.hand.includes(discardCardId)) throw new GameActionError("That card is not in your hand.");

  const idx = player.hand.indexOf(discardCardId);
  player.hand.splice(idx, 1);
  player.discard.push(discardCardId);
  gameState.turnFlags.pendingDiscard = null;

  return [`${player.display_name} discarded ${getCardDef(discardCardId).name} (Wand of Recalling).`];
}

// =========================================================
// MOVE
// =========================================================
export function moveAction(
  ctx: EngineContext,
  playerId: string,
  toRoomId: string,
  opts: { paySwordsForMonster?: boolean; useTeleportCharge?: boolean } = {}
): string[] {
  const player = requireActivePlayer(ctx, playerId);
  const log: string[] = [];
  const fromRoomId = player.position;
  const toRoom = ROOM_BY_ID[toRoomId];
  if (!toRoom) throw new GameActionError("Unknown room.");

  const tunnel = getTunnel(fromRoomId, toRoomId);
  if (!tunnel) throw new GameActionError("That room is not adjacent to your current position.");

  const gameState = ctx.game.game_state;
  const useTeleport = !!opts.useTeleportCharge && gameState.teleportCharges > 0;

  if (!useTeleport) {
    if (tunnel.requires_key && !player.tokens.includes("master_key")) {
      throw new GameActionError("That tunnel is locked. You need the Master Key.");
    }
    if (gameState.turnFlags.crystalCaveStop) {
      throw new GameActionError("You stopped in a Crystal Cave this turn — no more movement is allowed.");
    }
    if (gameState.turnPool.boots < tunnel.cost_boots) {
      throw new GameActionError(`Not enough Boots (need ${tunnel.cost_boots}).`);
    }
    if (tunnel.monster_damage > 0) {
      if (opts.paySwordsForMonster) {
        if (gameState.turnPool.swords < tunnel.monster_damage) {
          throw new GameActionError(`Not enough Swords to fight past the monster (need ${tunnel.monster_damage}).`);
        }
        spendPool(gameState.turnPool, "swords", tunnel.monster_damage);
        log.push(`Fought past a monster in the tunnel (${tunnel.monster_damage} Swords).`);
      } else {
        if (player.health - tunnel.monster_damage <= 0) {
          throw new GameActionError(
            `Moving there would knock you out (${tunnel.monster_damage} damage). Spend Swords to fight past instead.`
          );
        }
        applyDamage(player, tunnel.monster_damage, gameState);
        log.push(`Took ${tunnel.monster_damage} damage from a monster in the tunnel.`);
      }
    }
    spendPool(gameState.turnPool, "boots", tunnel.cost_boots);
  } else {
    gameState.teleportCharges -= 1;
    log.push(`Teleported through the tunnel, ignoring its cost.`);
  }

  player.position = toRoomId;
  gameState.turnFlags.hasMovedThisTurn = true;
  log.push(`Moved to ${toRoom.label} (cost ${useTeleport ? 0 : tunnel.cost_boots} boot${tunnel.cost_boots === 1 ? "" : "s"}).`);

  if (toRoom.type === "crystal_cave") {
    gameState.turnFlags.crystalCaveStop = true;
    log.push(`Entered a Crystal Cave — movement ends for the rest of the turn.`);
  }

  collectRoomTokens(player, toRoom.id, gameState, log);

  if (toRoomId === "entrance" && player.artifacts.length > 0 && !player.has_escaped) {
    player.has_escaped = true;
    log.push(`${player.display_name} escaped the dungeon with an artifact worth ${player.artifacts.reduce((s, a) => s + a.value, 0)} points!`);
    if (ctx.game.countdown_track === null) {
      ctx.game.countdown_track = 0;
      ctx.game.first_escape_player_id = player.id;
      log.push(`The Countdown begins! The dragon senses the escape.`);
    }
  }

  return log;
}

function collectRoomTokens(player: PlayerRow, roomId: string, gameState: GameState, log: string[]) {
  const room = ROOM_BY_ID[roomId];
  const tokenState = gameState.rooms[roomId];
  if (!tokenState) return;
  const bonus = gameState.turnFlags.archaeologistBonusAvailable;

  if (room.type === "artifact" && tokenState.artifactValue !== undefined) {
    const hasBackpack = player.tokens.includes("backpack");
    const canTake = player.artifacts.length === 0 || hasBackpack || bonus;
    if (canTake) {
      player.artifacts.push({ roomId, value: tokenState.artifactValue });
      log.push(`Picked up an Artifact worth ${tokenState.artifactValue} points.`);
      delete tokenState.artifactValue;
      if (!hasBackpack && player.artifacts.length > 1) gameState.turnFlags.archaeologistBonusAvailable = false;
    } else {
      log.push(`Found an Artifact but cannot carry it without a Backpack.`);
    }
    return;
  }
  if (room.type === "secret" && tokenState.majorSecret) {
    player.tokens.push(`major_secret_${tokenState.majorSecret}`);
    log.push(`Picked up a Major Secret token: ${tokenState.majorSecret.replace(/_/g, " ")} (+7 pts).`);
    delete tokenState.majorSecret;
    return;
  }
  if (room.type === "minor_secret" && tokenState.minorSecret) {
    player.tokens.push(`minor_secret_${tokenState.minorSecret}`);
    log.push(`Picked up a Minor Secret token: ${tokenState.minorSecret.replace(/_/g, " ")} (+3 pts).`);
    delete tokenState.minorSecret;
    return;
  }
  if (room.type === "monkey_shrine" && tokenState.monkeyIdols && tokenState.monkeyIdols > 0) {
    tokenState.monkeyIdols -= 1;
    player.tokens.push("monkey_idol");
    log.push(`Picked up a Monkey Idol (+5 pts).`);
    if (bonus && tokenState.monkeyIdols > 0) {
      tokenState.monkeyIdols -= 1;
      player.tokens.push("monkey_idol");
      log.push(`Archaeologist bonus: picked up an extra Monkey Idol!`);
      gameState.turnFlags.archaeologistBonusAvailable = false;
    }
  }
}

// =========================================================
// BUY CARD (companions / items from Dungeon Row, or Reserve)
// =========================================================
export function buyCard(
  ctx: EngineContext,
  playerId: string,
  source: "row" | "reserve",
  identifier: string | number
): string[] {
  const player = requireActivePlayer(ctx, playerId);
  const log: string[] = [];
  const gameState = ctx.game.game_state;

  if (source === "reserve") {
    const baseId = identifier as string;
    const def = CARD_BY_ID[baseId];
    if (!def || def.type !== "reserve") throw new GameActionError("That is not a purchasable Reserve card.");
    if (gameState.turnPool.skill < (def.skill_cost || 0)) throw new GameActionError("Not enough Skill.");
    spendPool(gameState.turnPool, "skill", def.skill_cost || 0);
    const instance = instanceCardId(baseId, gameState.reserveInstanceCounter++);
    player.discard.push(instance);
    log.push(`Acquired ${def.name} from the Reserve (cost ${def.skill_cost} skill).`);
    return log;
  }

  const slot = identifier as number;
  if (slot < 0 || slot > 5) throw new GameActionError("Invalid Dungeon Row slot.");
  const cardInstanceId = ctx.dungeonRow[slot];
  if (!cardInstanceId) throw new GameActionError("That slot is empty.");
  const def = getCardDef(cardInstanceId);
  if (def.type !== "companion" && def.type !== "item") {
    throw new GameActionError("That card must be fought or used, not bought.");
  }
  if (gameState.turnPool.skill < (def.skill_cost || 0)) throw new GameActionError("Not enough Skill.");
  spendPool(gameState.turnPool, "skill", def.skill_cost || 0);
  player.discard.push(cardInstanceId);
  ctx.dungeonRow[slot] = null;
  log.push(`Acquired ${def.name} from the Dungeon Row (cost ${def.skill_cost} skill).`);
  refillSlot(ctx, slot, log);
  return log;
}

// =========================================================
// FIGHT MONSTER
// =========================================================
export function fightMonster(ctx: EngineContext, playerId: string, source: "row" | "reserve", slot?: number): string[] {
  const player = requireActivePlayer(ctx, playerId);
  const log: string[] = [];
  const gameState = ctx.game.game_state;

  if (source === "reserve") {
    const def = CARD_BY_ID["goblin"];
    if (gameState.turnPool.swords < (def.sword_cost || 0)) throw new GameActionError("Not enough Swords.");
    spendPool(gameState.turnPool, "swords", def.sword_cost || 0);
    if (def.defeatReward?.gold) player.gold += def.defeatReward.gold;
    log.push(`Fought the Goblin (${def.sword_cost} Sword) → gained ${def.defeatReward?.gold || 0} Gold.`);
    return log;
  }

  if (slot === undefined || slot < 0 || slot > 5) throw new GameActionError("Invalid Dungeon Row slot.");
  const cardInstanceId = ctx.dungeonRow[slot];
  if (!cardInstanceId) throw new GameActionError("That slot is empty.");
  const def = getCardDef(cardInstanceId);
  if (def.type !== "monster") throw new GameActionError("That card is not a monster.");
  if (gameState.turnPool.swords < (def.sword_cost || 0)) throw new GameActionError("Not enough Swords.");
  spendPool(gameState.turnPool, "swords", def.sword_cost || 0);

  const reward = def.defeatReward || {};
  if (reward.gold) player.gold += reward.gold;
  if (reward.skill) gameState.turnPool.skill += reward.skill;
  if (reward.boots) gameState.turnPool.boots += reward.boots;
  if (reward.draw) drawCards(player, reward.draw);

  const effectCtx = { player, players: ctx.players, gameState, pool: gameState.turnPool, log };
  for (const effect of def.effects) {
    if (effect === "heal_1_on_defeat") resolveEffect(effect, cardInstanceId, effectCtx);
  }

  const rewardParts: string[] = [];
  if (reward.gold) rewardParts.push(`${reward.gold} Gold`);
  if (reward.skill) rewardParts.push(`${reward.skill} Skill`);
  if (reward.boots) rewardParts.push(`${reward.boots} Boots`);
  if (reward.draw) rewardParts.push(`drew ${reward.draw} card(s)`);
  log.push(`Defeated ${def.name} (${def.sword_cost} Swords) → gained ${rewardParts.join(", ") || "nothing"}.`);

  gameState.dungeonDiscard.push(cardInstanceId);
  ctx.dungeonRow[slot] = null;
  refillSlot(ctx, slot, log);
  return log;
}

// =========================================================
// USE DEVICE
// =========================================================
export function useDevice(ctx: EngineContext, playerId: string, slot: number, choices?: Record<string, any>): string[] {
  const player = requireActivePlayer(ctx, playerId);
  const log: string[] = [];
  const gameState = ctx.game.game_state;

  if (slot < 0 || slot > 5) throw new GameActionError("Invalid Dungeon Row slot.");
  const cardInstanceId = ctx.dungeonRow[slot];
  if (!cardInstanceId) throw new GameActionError("That slot is empty.");
  const def = getCardDef(cardInstanceId);
  if (def.type !== "device") throw new GameActionError("That card is not a device.");
  if (gameState.turnPool.skill < (def.skill_cost || 0)) throw new GameActionError("Not enough Skill.");
  spendPool(gameState.turnPool, "skill", def.skill_cost || 0);

  if (def.resources.clank) {
    const current = gameState.clankArea[player.id] || 0;
    gameState.clankArea[player.id] = Math.max(0, current + def.resources.clank);
  }

  const effectCtx = { player, players: ctx.players, gameState, pool: gameState.turnPool, log, choices };
  for (const effect of def.effects) {
    resolveEffect(effect, cardInstanceId, effectCtx);
  }
  log.push(`Used ${def.name} from the Dungeon Row (cost ${def.skill_cost} skill).`);

  gameState.dungeonDiscard.push(cardInstanceId);
  ctx.dungeonRow[slot] = null;
  refillSlot(ctx, slot, log);

  if (gameState.pendingDragonAttack) {
    gameState.pendingDragonAttack = undefined;
    runDragonAttack(ctx, "Alarm Crystal", 0, log);
  }

  return log;
}

function refillSlot(ctx: EngineContext, slot: number, log: string[]) {
  const { cards, dragonTriggers } = drawDungeonCards(ctx.game.game_state, 1);
  if (cards.length > 0) {
    ctx.dungeonRow[slot] = cards[0];
    applyArriveEffects(cards[0], ctx, log);
  } else {
    ctx.dungeonRow[slot] = null;
  }
  for (let i = 0; i < dragonTriggers; i++) {
    runDragonAttack(ctx, "Dragon marker drawn from the Dungeon deck", 0, log);
  }
}

// =========================================================
// MARKET PURCHASE
// =========================================================
export function buyMarketItem(ctx: EngineContext, playerId: string, item: "crown" | "backpack" | "master_key"): string[] {
  const player = requireActivePlayer(ctx, playerId);
  const log: string[] = [];
  if (player.position !== "market") throw new GameActionError("You must be in the Market room to buy market items.");
  if (player.gold < 7) throw new GameActionError("Market items cost 7 Gold.");

  const market = ctx.game.game_state.market;
  if (item === "crown") {
    if (!market.crownAvailable) throw new GameActionError("The Crown has already been claimed.");
    market.crownAvailable = false;
    player.gold -= 7;
    player.tokens.push("crown");
    log.push(`Bought the Crown for 7 Gold (worth ${market.crownValue} pts).`);
  } else if (item === "backpack") {
    if (!market.backpackAvailable) throw new GameActionError("The Backpack has already been claimed.");
    market.backpackAvailable = false;
    player.gold -= 7;
    player.tokens.push("backpack");
    log.push(`Bought the Backpack for 7 Gold (worth 5 pts, lets you carry 2 artifacts).`);
  } else if (item === "master_key") {
    if (!market.masterKeyAvailable) throw new GameActionError("The Master Key has already been claimed.");
    market.masterKeyAvailable = false;
    player.gold -= 7;
    player.tokens.push("master_key");
    log.push(`Bought the Master Key for 7 Gold (worth 5 pts, unlocks the Monkey Shrine tunnel).`);
  }
  return log;
}

// =========================================================
// END TURN  (discard, refill checks, dragon attacks, advance, draw)
// =========================================================
export interface EndTurnResult {
  logs: string[];
  gameOver: boolean;
}

export function endTurn(ctx: EngineContext, playerId: string): EndTurnResult {
  const player = requireActivePlayer(ctx, playerId);
  const log: string[] = [];
  const gameState = ctx.game.game_state;

  if (!gameState.turnFlags.hasMovedThisTurn) {
    throw new GameActionError("You must move at least once before ending your turn.");
  }

  // Discard hand + in-play cards.
  const inPlay = gameState.inPlay[playerId] || [];
  player.discard.push(...player.hand, ...inPlay);
  player.hand = [];
  gameState.inPlay[playerId] = [];

  // Refill the Dungeon Row up to 6 cards (any slots left null get topped up too).
  // Any Dragon markers drawn along the way resolve immediately inside refillSlot.
  for (let slot = 0; slot < 6; slot++) {
    if (ctx.dungeonRow[slot] === null) {
      refillSlot(ctx, slot, log);
    }
  }

  // Countdown track tick: once started, it advances every time the
  // triggering player's turn comes back around.
  let gameOver = false;
  if (ctx.game.countdown_track !== null && ctx.game.first_escape_player_id === playerId) {
    const pos = ctx.game.countdown_track + 1;
    ctx.game.countdown_track = pos;
    const bonusTable: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3 };
    log.push(`The Countdown advances to space ${pos}.`);
    if (pos >= 5) {
      log.push(`The Countdown reaches space 5 — the dragon awakens! All remaining players in the dungeon are knocked out.`);
      for (const p of ctx.players) {
        if (!p.has_escaped && !p.is_knocked_out) {
          p.is_knocked_out = true;
          const room = ROOM_BY_ID[p.position];
          gameState.knockoutAboveGrassLine = gameState.knockoutAboveGrassLine || {};
          gameState.knockoutAboveGrassLine[p.id] = room ? !room.belowGrassLine : false;
        }
      }
      ctx.game.status = "finished";
      gameOver = true;
    } else {
      runDragonAttack(ctx, `Countdown space ${pos}`, bonusTable[pos] || 0, log);
    }
  }

  // Check if everyone is now escaped or knocked out.
  if (!gameOver && ctx.players.every((p) => p.has_escaped || p.is_knocked_out)) {
    ctx.game.status = "finished";
    gameOver = true;
    log.push(`All players have left the dungeon — the game ends!`);
  }

  if (!gameOver) {
    // Advance to next active (still-in-dungeon) player.
    const order = ctx.game.player_order;
    let nextIndex = ctx.game.current_player_index;
    for (let i = 0; i < order.length; i++) {
      nextIndex = (nextIndex + 1) % order.length;
      const nextPlayer = ctx.players.find((p) => p.id === order[nextIndex]);
      if (nextPlayer && !nextPlayer.has_escaped && !nextPlayer.is_knocked_out) break;
    }
    ctx.game.current_player_index = nextIndex;
    ctx.game.turn_number += 1;

    const nextPlayer = ctx.players.find((p) => p.id === order[nextIndex]);
    gameState.turnPool = emptyPool();
    gameState.turnFlags = emptyTurnFlags();
    gameState.teleportCharges = 0;
    if (nextPlayer) {
      const drawn = drawCards(nextPlayer, HAND_SIZE - nextPlayer.hand.length);
      log.push(`${nextPlayer.display_name} drew ${drawn.length} card(s). It is now their turn.`);
    }
  }

  return { logs: log, gameOver };
}

// =========================================================
// MANUAL DRAGON ATTACK (used directly by the /api/game/dragon-attack route
// for host-triggered or debug attacks; Alarm Crystal triggers inline in
// useDevice instead).
// =========================================================
export function manualDragonAttack(ctx: EngineContext): { logs: string[] } {
  const log: string[] = [];
  runDragonAttack(ctx, "Manual trigger", 0, log);
  ctx.game.game_state.pendingDragonAttack = undefined;
  return { logs: log };
}

// =========================================================
// SKIP TURN (disconnected player)
// =========================================================
export function skipTurn(ctx: EngineContext): EndTurnResult {
  const currentId = ctx.game.player_order[ctx.game.current_player_index];
  const player = ctx.players.find((p) => p.id === currentId);
  if (!player) throw new GameActionError("Current player not found.");
  // Ensure they satisfy the "must move" requirement implicitly when skipped.
  ctx.game.game_state.turnFlags.hasMovedThisTurn = true;
  const result = endTurn(ctx, currentId);
  result.logs.unshift(`${player.display_name}'s turn was skipped (inactive).`);
  return result;
}
