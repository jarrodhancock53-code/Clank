// Full card database for Clank! Online.
// Every card is a plain data object. Effects are resolved by lib/game/effects.ts.

export type Banner = "gray" | "yellow" | "blue" | "red" | "purple";
export type CardType = "starting" | "reserve" | "companion" | "item" | "monster" | "device";

export interface CardResources {
  skill?: number;
  swords?: number;
  boots?: number;
  gold?: number;
  clank?: number; // positive = makes noise (add to clank area), negative = removes cubes from clank area
}

export interface DefeatReward {
  gold?: number;
  skill?: number;
  boots?: number;
  draw?: number;
}

export interface CardDef {
  id: string;
  name: string;
  banner: Banner;
  type: CardType;
  skill_cost?: number;
  sword_cost?: number;
  points: number;
  resources: CardResources;
  effects: string[];
  description: string;
  isDanger?: boolean;
  arriveEffect?: string;
  reactEffect?: string;
  defeatReward?: DefeatReward;
  qty: number;
}

function card(def: CardDef): CardDef {
  return def;
}

// =========================================================
// STARTING DECK — gray banner. Each player begins with this 10-card deck.
// =========================================================
export const STARTING_CARDS: CardDef[] = [
  card({ id: "burgle", name: "Burgle", banner: "gray", type: "starting", points: 0, resources: { skill: 1 }, effects: [], description: "Gain 1 Skill.", qty: 6 }),
  card({ id: "stumble", name: "Stumble", banner: "gray", type: "starting", points: 0, resources: { clank: 1 }, effects: [], description: "Make 1 Clank noise.", qty: 2 }),
  card({ id: "sidestep", name: "Sidestep", banner: "gray", type: "starting", points: 0, resources: { boots: 1 }, effects: [], description: "Gain 1 Boot.", qty: 1 }),
  card({ id: "scramble", name: "Scramble", banner: "gray", type: "starting", points: 0, resources: { boots: 2 }, effects: [], description: "Gain 2 Boots.", qty: 1 }),
];

// =========================================================
// RESERVE CARDS — yellow banner, always purchasable / always available to fight.
// =========================================================
export const RESERVE_CARDS: CardDef[] = [
  card({ id: "goblin", name: "Goblin", banner: "yellow", type: "monster", sword_cost: 1, points: 0, resources: {}, effects: [], defeatReward: { gold: 1 }, description: "Reserve monster. Spend 1 Sword to defeat for 1 Gold. Never leaves the reserve — may be fought any number of times by any player.", qty: Infinity }),
  card({ id: "mercenary", name: "Mercenary", banner: "yellow", type: "reserve", skill_cost: 2, points: 1, resources: { swords: 1, gold: 1 }, effects: [], description: "Gain 1 Sword and 1 Gold.", qty: Infinity }),
  card({ id: "explore", name: "Explore", banner: "yellow", type: "reserve", skill_cost: 3, points: 1, resources: { boots: 2, skill: 1 }, effects: [], description: "Gain 2 Boots and 1 Skill.", qty: Infinity }),
  card({ id: "secret_tome", name: "Secret Tome", banner: "yellow", type: "reserve", skill_cost: 7, points: 7, resources: {}, effects: [], description: "Worth 7 points. No other effect.", qty: Infinity }),
];

// =========================================================
// DUNGEON DECK — companions & items (blue banner)
// =========================================================
export const COMPANION_CARDS: CardDef[] = [
  card({ id: "kobold_merchant", name: "Kobold Merchant", banner: "blue", type: "companion", skill_cost: 3, points: 1, resources: { gold: 2, skill: 1 }, effects: [], description: "Gain 2 Gold and 1 Skill.", qty: 2 }),
  card({ id: "acolyte", name: "Acolyte", banner: "blue", type: "companion", skill_cost: 2, points: 1, resources: { skill: 2 }, effects: [], description: "Gain 2 Skill.", qty: 2 }),
  card({ id: "tunnel_guide", name: "Tunnel Guide", banner: "blue", type: "companion", skill_cost: 3, points: 1, resources: { boots: 2, skill: 1 }, effects: [], description: "Gain 2 Boots and 1 Skill.", qty: 2 }),
  card({ id: "fighter", name: "Fighter", banner: "blue", type: "companion", skill_cost: 3, points: 1, resources: { swords: 2 }, effects: [], description: "Gain 2 Swords.", qty: 2 }),
  card({ id: "pickpocket", name: "Pickpocket", banner: "blue", type: "companion", skill_cost: 4, points: 2, resources: { gold: 1, skill: 1, boots: 1 }, effects: [], description: "Gain 1 Gold, 1 Skill, and 1 Boot.", qty: 2 }),
  card({ id: "apothecary", name: "Apothecary", banner: "blue", type: "companion", skill_cost: 4, points: 2, resources: { skill: 2 }, effects: ["heal_1"], description: "Gain 2 Skill. Heal 1 damage.", qty: 2 }),
  card({ id: "rebel_scout", name: "Rebel Scout", banner: "blue", type: "companion", skill_cost: 3, points: 1, resources: { boots: 1 }, effects: ["if_another_companion_in_play_draw_1"], description: "Gain 1 Boot. If you have another Companion in play, draw 1 card.", qty: 2 }),
  card({ id: "treasure_hunter", name: "Treasure Hunter", banner: "blue", type: "companion", skill_cost: 5, points: 2, resources: { skill: 2, gold: 1 }, effects: [], description: "Gain 2 Skill and 1 Gold.", qty: 2 }),
  card({ id: "mountain_king", name: "Mountain King", banner: "blue", type: "companion", skill_cost: 6, points: 3, resources: { swords: 1, boots: 1 }, effects: ["if_have_crown_plus_1_sword_1_boot"], description: "Gain 1 Sword and 1 Boot. If you have the Crown, gain 1 more of each.", qty: 2 }),
  card({ id: "burglar", name: "Burglar", banner: "blue", type: "companion", skill_cost: 5, points: 2, resources: { gold: 2, boots: 1 }, effects: [], description: "Gain 2 Gold and 1 Boot.", qty: 2 }),
  card({ id: "archaeologist", name: "Archaeologist", banner: "blue", type: "companion", skill_cost: 4, points: 2, resources: { skill: 1, boots: 1 }, effects: ["may_take_extra_token_when_entering_room"], description: "Gain 1 Skill and 1 Boot. The next room you enter this turn, you may take an extra token if present.", qty: 2 }),
  card({ id: "watcher", name: "Watcher", banner: "blue", type: "companion", skill_cost: 3, points: 1, resources: { skill: 2 }, effects: ["draw_1"], description: "Gain 2 Skill. Draw 1 card.", qty: 2 }),
  card({ id: "wizard", name: "Wizard", banner: "blue", type: "companion", skill_cost: 5, points: 2, resources: { skill: 3 }, effects: ["trash_1_from_discard"], description: "Gain 3 Skill. Trash 1 card from your discard pile.", qty: 2 }),
  card({ id: "bard", name: "Bard", banner: "blue", type: "companion", skill_cost: 3, points: 1, resources: { skill: 1, gold: 1 }, effects: [], description: "Gain 1 Skill and 1 Gold.", qty: 2 }),
  card({ id: "ranger", name: "Ranger", banner: "blue", type: "companion", skill_cost: 4, points: 2, resources: { swords: 1, boots: 1, skill: 1 }, effects: [], description: "Gain 1 Sword, 1 Boot, and 1 Skill.", qty: 2 }),
  card({ id: "rogue", name: "Rogue", banner: "blue", type: "companion", skill_cost: 4, points: 2, resources: { gold: 2 }, effects: ["trash_1_from_hand"], description: "Gain 2 Gold. Trash 1 card from your hand.", qty: 2 }),
  card({ id: "siren", name: "Siren", banner: "blue", type: "companion", skill_cost: 5, points: 2, resources: { skill: 2, boots: 1, clank: -1 }, effects: [], description: "Gain 2 Skill and 1 Boot. Remove 1 of your Clank cubes from the Clank Area.", qty: 2 }),
  card({ id: "dungeon_guide", name: "Dungeon Guide", banner: "blue", type: "companion", skill_cost: 3, points: 1, resources: { boots: 1, skill: 1 }, effects: [], description: "Gain 1 Boot and 1 Skill.", qty: 2 }),
  card({ id: "engineer", name: "Engineer", banner: "blue", type: "companion", skill_cost: 4, points: 2, resources: { skill: 2, swords: 1 }, effects: [], description: "Gain 2 Skill and 1 Sword.", qty: 2 }),
  card({ id: "move_silently", name: "Move Silently", banner: "blue", type: "companion", skill_cost: 3, points: 1, resources: { boots: 1, clank: -2 }, effects: [], description: "Gain 1 Boot. Remove 2 of your Clank cubes from the Clank Area.", qty: 2 }),

  card({ id: "wand_of_wind", name: "Wand of Wind", banner: "blue", type: "item", skill_cost: 4, points: 2, resources: { boots: 1 }, effects: ["teleport_1"], description: "Gain 1 Boot. Teleport to 1 adjacent room, ignoring its boot cost, monster damage, and lock.", qty: 2 }),
  card({ id: "wand_of_recalling", name: "Wand of Recalling", banner: "blue", type: "item", skill_cost: 4, points: 2, resources: { skill: 2 }, effects: ["draw_2_discard_1"], description: "Gain 2 Skill. Draw 2 cards, then discard 1.", qty: 2 }),
  card({ id: "slippers_of_swiftness", name: "Slippers of Swiftness", banner: "blue", type: "item", skill_cost: 4, points: 2, resources: { boots: 3, clank: 1 }, effects: [], description: "Gain 3 Boots. Make 1 Clank noise.", qty: 2 }),
  card({ id: "ring_of_power", name: "Ring of Power", banner: "blue", type: "item", skill_cost: 5, points: 2, resources: { swords: 2, skill: 1 }, effects: [], description: "Gain 2 Swords and 1 Skill.", qty: 2 }),
  card({ id: "cloak_of_shadows", name: "Cloak of Shadows", banner: "blue", type: "item", skill_cost: 5, points: 3, resources: { boots: 1, skill: 1, clank: -2 }, effects: [], description: "Gain 1 Boot and 1 Skill. Remove 2 of your Clank cubes from the Clank Area.", qty: 2 }),
  card({ id: "magic_map", name: "Magic Map", banner: "blue", type: "item", skill_cost: 4, points: 2, resources: { skill: 2 }, effects: ["look_at_top_3_dungeon_cards_reorder"], description: "Gain 2 Skill. Look at the top 3 cards of the Dungeon deck and rearrange them.", qty: 2 }),
  card({ id: "elven_boots", name: "Elven Boots", banner: "blue", type: "item", skill_cost: 3, points: 1, resources: { boots: 2, clank: -1 }, effects: [], description: "Gain 2 Boots. Remove 1 of your Clank cubes from the Clank Area.", qty: 2 }),
  card({ id: "skill_boost_card", name: "Skill Boost", banner: "blue", type: "item", skill_cost: 2, points: 1, resources: { skill: 3, clank: 1 }, effects: [], description: "Gain 3 Skill. Make 1 Clank noise.", qty: 2 }),
  card({ id: "swagger", name: "Swagger", banner: "blue", type: "item", skill_cost: 3, points: 1, resources: { skill: 1 }, effects: ["plus_1_skill_per_clank_made_this_turn"], description: "Gain 1 Skill, plus 1 more Skill for every Clank cube you've made noise with this turn.", qty: 2 }),
  card({ id: "sleight_of_hand", name: "Sleight of Hand", banner: "blue", type: "item", skill_cost: 3, points: 1, resources: { skill: 1 }, effects: ["discard_1_to_draw_2"], description: "Gain 1 Skill. You may discard 1 card from your hand to draw 2 cards.", qty: 2 }),
];

// =========================================================
// MONSTERS — red banner. Fought with swords, then discarded (back to the box).
// =========================================================
export const MONSTER_CARDS: CardDef[] = [
  card({ id: "orc_grunt", name: "Orc Grunt", banner: "red", type: "monster", sword_cost: 2, points: 0, resources: { clank: 1 }, effects: [], defeatReward: { gold: 3 }, description: "Arrives making 1 Clank. Defeat with 2 Swords for 3 Gold.", qty: 3 }),
  card({ id: "goblin_archer", name: "Goblin Archer", banner: "red", type: "monster", sword_cost: 2, points: 0, resources: { clank: 0 }, effects: [], defeatReward: { skill: 2 }, description: "Defeat with 2 Swords for 2 Skill.", qty: 3 }),
  card({ id: "cave_troll", name: "Cave Troll", banner: "red", type: "monster", sword_cost: 3, points: 0, resources: { clank: 2 }, effects: [], isDanger: true, defeatReward: { gold: 2, skill: 1 }, description: "DANGER. Arrives making 2 Clank. Defeat with 3 Swords for 2 Gold and 1 Skill.", qty: 2 }),
  card({ id: "skeletal_guard", name: "Skeletal Guard", banner: "red", type: "monster", sword_cost: 2, points: 0, resources: { clank: 0 }, effects: [], defeatReward: { gold: 1, boots: 1 }, description: "Defeat with 2 Swords for 1 Gold and 1 Boot.", qty: 2 }),
  card({ id: "wyvern", name: "Wyvern", banner: "red", type: "monster", sword_cost: 4, points: 0, resources: { clank: 2 }, effects: [], isDanger: true, defeatReward: { gold: 3, skill: 2 }, description: "DANGER. Arrives making 2 Clank. Defeat with 4 Swords for 3 Gold and 2 Skill.", qty: 2 }),
  card({ id: "vampire", name: "Vampire", banner: "red", type: "monster", sword_cost: 3, points: 0, resources: { clank: 1 }, effects: ["heal_1_on_defeat"], defeatReward: { gold: 2 }, description: "Arrives making 1 Clank. Defeat with 3 Swords for 2 Gold and heal 1 damage.", qty: 2 }),
  card({ id: "mimic", name: "Mimic", banner: "red", type: "monster", sword_cost: 2, points: 0, resources: { clank: 0 }, effects: [], arriveEffect: "all_players_plus_1_clank", defeatReward: { gold: 2, draw: 1 }, description: "ARRIVE: all players gain 1 Clank. Defeat with 2 Swords for 2 Gold and draw 1 card.", qty: 2 }),
  card({ id: "overlord", name: "Overlord", banner: "red", type: "monster", sword_cost: 5, points: 0, resources: { clank: 3 }, effects: [], isDanger: true, arriveEffect: "all_players_plus_1_clank", defeatReward: { gold: 4, skill: 2 }, description: "DANGER. Arrives making 3 Clank; all players also gain 1 Clank. Defeat with 5 Swords for 4 Gold and 2 Skill.", qty: 1 }),
  card({ id: "assassin", name: "Assassin", banner: "red", type: "monster", sword_cost: 2, points: 0, resources: { clank: -1 }, effects: [], reactEffect: "play_from_hand_on_monster_arrive", defeatReward: { gold: 1, skill: 1 }, description: "Arrives removing 1 Clank cube from your Clank Area. REACT: when any monster arrives, you may immediately play a card from your hand. Defeat with 2 Swords for 1 Gold and 1 Skill.", qty: 2 }),
];

// =========================================================
// DEVICES — purple banner. Used immediately, then discarded; never enter a deck.
// =========================================================
export const DEVICE_CARDS: CardDef[] = [
  card({ id: "crystal_heart", name: "Crystal Heart", banner: "purple", type: "device", skill_cost: 4, points: 0, resources: {}, effects: ["teleport_to_any_room_no_boots"], description: "Teleport your pawn to any room on the board, ignoring boot costs (monster damage on the path is NOT applied).", qty: 2 }),
  card({ id: "dungeon_map", name: "Dungeon Map", banner: "purple", type: "device", skill_cost: 3, points: 0, resources: {}, effects: ["gain_2_boots_this_turn"], description: "Gain 2 Boots this turn.", qty: 2 }),
  card({ id: "potion_of_swiftness_card", name: "Potion of Swiftness", banner: "purple", type: "device", skill_cost: 2, points: 0, resources: {}, effects: ["gain_3_boots_this_turn"], description: "Gain 3 Boots this turn.", qty: 2 }),
  card({ id: "trap", name: "Trap", banner: "purple", type: "device", skill_cost: 3, points: 0, resources: {}, effects: ["all_other_players_plus_2_clank"], description: "All other players gain 2 Clank.", qty: 2 }),
  card({ id: "smoke_bomb", name: "Smoke Bomb", banner: "purple", type: "device", skill_cost: 3, points: 0, resources: { clank: -3 }, effects: [], description: "Remove 3 of your Clank cubes from the Clank Area.", qty: 2 }),
  card({ id: "alarm_crystal", name: "Alarm Crystal", banner: "purple", type: "device", skill_cost: 2, points: 0, resources: { clank: -2 }, effects: ["dragon_attack_now"], description: "Remove 2 of your Clank cubes from the Clank Area, then trigger an immediate Dragon Attack.", qty: 2 }),
  card({ id: "resurrection_potion", name: "Resurrection Potion", banner: "purple", type: "device", skill_cost: 5, points: 0, resources: {}, effects: ["heal_3"], description: "Heal 3 damage.", qty: 2 }),
  card({ id: "dragon_scale_armor", name: "Dragon Scale Armor", banner: "purple", type: "device", skill_cost: 4, points: 0, resources: {}, effects: ["next_dragon_attack_take_0_damage_this_player"], description: "The next Dragon Attack, you take 0 damage.", qty: 2 }),
  card({ id: "catapult", name: "Catapult", banner: "purple", type: "device", skill_cost: 5, points: 0, resources: {}, effects: ["move_any_player_pawn_to_entrance"], description: "Move any player's pawn (including your own) to the Entrance.", qty: 1 }),
  card({ id: "master_burglar_kit", name: "Master Burglar Kit", banner: "purple", type: "device", skill_cost: 4, points: 0, resources: {}, effects: ["take_any_secret_token_in_any_room_without_moving"], description: "Take any one secret token from any room on the board without moving your pawn.", qty: 2 }),
];

export const DUNGEON_DECK_CARDS: CardDef[] = [
  ...COMPANION_CARDS,
  ...MONSTER_CARDS,
  ...DEVICE_CARDS,
];

export const ALL_CARD_DEFS: CardDef[] = [
  ...STARTING_CARDS,
  ...RESERVE_CARDS,
  ...DUNGEON_DECK_CARDS,
];

export const CARD_BY_ID: Record<string, CardDef> = ALL_CARD_DEFS.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {} as Record<string, CardDef>);

// A "card instance" in hand/deck/discard/row is referenced by a unique
// instance id of the form `${cardId}__${n}` so duplicate cards can be
// distinguished, while CARD_BY_ID[cardId] gives the shared definition.
export function instanceCardId(baseId: string, n: number): string {
  return `${baseId}__${n}`;
}

export function baseCardId(instanceId: string): string {
  return instanceId.split("__")[0];
}

export function getCardDef(instanceId: string): CardDef {
  const def = CARD_BY_ID[baseCardId(instanceId)];
  if (!def) throw new Error(`Unknown card: ${instanceId}`);
  return def;
}

export function buildStartingDeck(): string[] {
  const cards: string[] = [];
  let n = 0;
  for (const c of STARTING_CARDS) {
    for (let i = 0; i < c.qty; i++) {
      cards.push(instanceCardId(c.id, n++));
    }
  }
  return cards;
}

export function buildDungeonDeck(): string[] {
  const cards: string[] = [];
  let n = 0;
  for (const c of DUNGEON_DECK_CARDS) {
    for (let i = 0; i < c.qty; i++) {
      cards.push(instanceCardId(c.id, n++));
    }
  }
  return cards;
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
