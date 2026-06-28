import { CARD_BY_ID, baseCardId, getCardDef, shuffle } from "./cards";
import { GameActionError, GameState, MAX_HEALTH, PlayerRow, ResourcePool } from "./types";

export interface EffectContext {
  player: PlayerRow;
  players: PlayerRow[];
  gameState: GameState;
  pool: ResourcePool;
  log: string[];
  // Optional client-supplied choices for effects that need them.
  choices?: Record<string, any>;
}

function drawCards(player: PlayerRow, count: number, log?: string[]): void {
  for (let i = 0; i < count; i++) {
    if (player.deck.length === 0) {
      if (player.discard.length === 0) return; // nothing left to draw
      player.deck = shuffle(player.discard);
      player.discard = [];
      if (log) log.push(`${player.display_name}'s deck was reshuffled from the discard pile.`);
    }
    const card = player.deck.shift();
    if (card) player.hand.push(card);
  }
}

export function healPlayer(player: PlayerRow, amount: number): number {
  const before = player.health;
  player.health = Math.min(MAX_HEALTH, player.health + amount);
  return player.health - before;
}

export function addClankToArea(gameState: GameState, playerId: string, amount: number): void {
  if (amount === 0) return;
  const current = gameState.clankArea[playerId] || 0;
  gameState.clankArea[playerId] = Math.max(0, current + amount);
}

/**
 * Resolves the named effect of a played/used card. Mutates ctx in place.
 * `cardInstanceId` is the instance that triggered the effect (for effects
 * that need to know which card they came from, e.g. trashing themselves).
 */
export function resolveEffect(effectId: string, cardInstanceId: string, ctx: EffectContext): void {
  const { player, players, gameState, pool, log } = ctx;

  switch (effectId) {
    case "heal_1": {
      const healed = healPlayer(player, 1);
      if (healed > 0) log.push(`${player.display_name} healed ${healed} damage.`);
      return;
    }
    case "heal_3": {
      const healed = healPlayer(player, 3);
      if (healed > 0) log.push(`${player.display_name} healed ${healed} damage.`);
      return;
    }
    case "heal_1_on_defeat": {
      const healed = healPlayer(player, 1);
      if (healed > 0) log.push(`${player.display_name} healed ${healed} damage.`);
      return;
    }
    case "draw_1": {
      drawCards(player, 1, log);
      log.push(`${player.display_name} drew 1 card.`);
      return;
    }
    case "draw_2_discard_1": {
      drawCards(player, 2, log);
      const discardTarget = ctx.choices?.discardCardId || player.hand[player.hand.length - 1];
      const idx = player.hand.indexOf(discardTarget);
      if (idx >= 0) {
        player.hand.splice(idx, 1);
        player.discard.push(discardTarget);
      }
      log.push(`${player.display_name} drew 2 cards and discarded 1.`);
      return;
    }
    case "discard_1_to_draw_2": {
      const discardTarget = ctx.choices?.discardCardId;
      if (discardTarget && player.hand.includes(discardTarget)) {
        const idx = player.hand.indexOf(discardTarget);
        player.hand.splice(idx, 1);
        player.discard.push(discardTarget);
        drawCards(player, 2, log);
        log.push(`${player.display_name} discarded a card to draw 2.`);
      }
      return;
    }
    case "if_another_companion_in_play_draw_1": {
      const inPlay = gameState.inPlay[player.id] || [];
      const hasAnotherCompanion = inPlay.some((id: string) => {
        if (id === cardInstanceId) return false;
        const def = CARD_BY_ID[baseCardId(id)];
        return def?.type === "companion";
      });
      if (hasAnotherCompanion) {
        drawCards(player, 1, log);
        log.push(`${player.display_name}'s Rebel Scout drew 1 card.`);
      }
      return;
    }
    case "if_have_crown_plus_1_sword_1_boot": {
      if (player.tokens.includes("crown")) {
        pool.swords += 1;
        pool.boots += 1;
        log.push(`${player.display_name}'s Mountain King granted +1 Sword, +1 Boot (Crown bonus).`);
      }
      return;
    }
    case "trash_1_from_discard": {
      const target = ctx.choices?.trashCardId || player.discard[player.discard.length - 1];
      const idx = player.discard.indexOf(target);
      if (idx >= 0) {
        player.discard.splice(idx, 1);
        log.push(`${player.display_name} trashed a card from their discard pile.`);
      }
      return;
    }
    case "trash_1_from_hand": {
      const target = ctx.choices?.trashCardId || player.hand.find((c) => c !== cardInstanceId);
      if (target) {
        const idx = player.hand.indexOf(target);
        if (idx >= 0) {
          player.hand.splice(idx, 1);
          log.push(`${player.display_name} trashed a card from their hand.`);
        }
      }
      return;
    }
    case "plus_1_skill_per_clank_made_this_turn": {
      const bonus = gameState.turnFlags.clankMadeThisTurn;
      if (bonus > 0) {
        pool.skill += bonus;
        log.push(`${player.display_name}'s Swagger granted +${bonus} Skill.`);
      }
      return;
    }
    case "may_take_extra_token_when_entering_room": {
      gameState.turnFlags.archaeologistBonusAvailable = true;
      return;
    }
    case "look_at_top_3_dungeon_cards_reorder": {
      const top3 = gameState.dungeonDeck.slice(0, 3);
      const order: string[] = ctx.choices?.reorder;
      if (order && order.length === top3.length && order.every((c) => top3.includes(c))) {
        gameState.dungeonDeck.splice(0, 3, ...order);
        log.push(`${player.display_name} examined and rearranged the top of the Dungeon deck.`);
      } else {
        log.push(`${player.display_name} examined the top of the Dungeon deck.`);
      }
      return;
    }
    case "teleport_1": {
      // Movement is resolved by the move action; this effect just grants
      // a single move that ignores boot cost / monster damage / locks.
      gameState.teleportCharges += 1;
      log.push(`${player.display_name} may teleport through 1 tunnel, ignoring its cost, this turn.`);
      return;
    }
    case "teleport_to_any_room_no_boots": {
      const targetRoom = ctx.choices?.targetRoom;
      if (targetRoom) {
        player.position = targetRoom;
        log.push(`${player.display_name} used Crystal Heart to teleport to ${targetRoom}.`);
      }
      return;
    }
    case "gain_2_boots_this_turn": {
      pool.boots += 2;
      return;
    }
    case "gain_3_boots_this_turn": {
      pool.boots += 3;
      return;
    }
    case "all_other_players_plus_2_clank": {
      for (const p of players) {
        if (p.id !== player.id) {
          addClankToArea(gameState, p.id, 2);
        }
      }
      log.push(`${player.display_name} used Trap — all other players gained 2 Clank.`);
      return;
    }
    case "dragon_attack_now": {
      gameState.pendingDragonAttack = { cubesToDraw: 0, reason: "alarm_crystal" };
      log.push(`${player.display_name} triggered an immediate Dragon Attack with the Alarm Crystal!`);
      return;
    }
    case "next_dragon_attack_take_0_damage_this_player": {
      gameState.turnFlags.dragonScaleArmor[player.id] = true;
      log.push(`${player.display_name} is shielded from the next Dragon Attack.`);
      return;
    }
    case "move_any_player_pawn_to_entrance": {
      const targetPlayerId = ctx.choices?.targetPlayerId || player.id;
      const target = players.find((p) => p.id === targetPlayerId);
      if (target) {
        target.position = "entrance";
        log.push(`${player.display_name} used Catapult to send ${target.display_name} to the Entrance.`);
      }
      return;
    }
    case "take_any_secret_token_in_any_room_without_moving": {
      const roomId = ctx.choices?.targetRoom;
      const tokenType = ctx.choices?.tokenType as "majorSecret" | "minorSecret" | "monkeyIdols" | undefined;
      if (roomId && tokenType && gameState.rooms[roomId]) {
        const room = gameState.rooms[roomId];
        if (tokenType === "monkeyIdols" && room.monkeyIdols && room.monkeyIdols > 0) {
          room.monkeyIdols -= 1;
          player.tokens.push("monkey_idol");
          log.push(`${player.display_name} used Master Burglar Kit to take a Monkey Idol from ${roomId}.`);
        } else if (tokenType === "majorSecret" && room.majorSecret) {
          player.tokens.push(`major_secret_${room.majorSecret}`);
          delete room.majorSecret;
          log.push(`${player.display_name} used Master Burglar Kit to take a Major Secret from ${roomId}.`);
        } else if (tokenType === "minorSecret" && room.minorSecret) {
          player.tokens.push(`minor_secret_${room.minorSecret}`);
          delete room.minorSecret;
          log.push(`${player.display_name} used Master Burglar Kit to take a Minor Secret from ${roomId}.`);
        }
      }
      return;
    }
    case "none":
      return;
    default:
      return;
  }
}

export function applyCardResources(card: ReturnType<typeof getCardDef>, pool: ResourcePool, gameState: GameState, player: PlayerRow): void {
  const r = card.resources;
  if (r.skill) pool.skill += r.skill;
  if (r.swords) pool.swords += r.swords;
  if (r.boots) pool.boots += r.boots;
  if (r.gold) player.gold += r.gold;
  if (r.clank) {
    if (r.clank > 0) {
      addClankToArea(gameState, player.id, r.clank);
      gameState.turnFlags.clankMadeThisTurn += r.clank;
    } else {
      const current = gameState.clankArea[player.id] || 0;
      gameState.clankArea[player.id] = Math.max(0, current + r.clank);
    }
  }
}

export function spendPool(pool: ResourcePool, key: keyof ResourcePool, amount: number): void {
  if (pool[key] < amount) {
    throw new GameActionError(`Not enough ${key} (have ${pool[key]}, need ${amount}).`);
  }
  pool[key] -= amount;
}
