import { CARD_BY_ID, baseCardId } from "./cards";
import { GameState, PlayerRow } from "./types";

export const MAJOR_SECRET_VALUE = 7; // e.g. Chalice
export const MINOR_SECRET_VALUE = 3; // e.g. Dragon Egg
export const MONKEY_IDOL_VALUE = 5;
export const BACKPACK_VALUE = 5;
export const MASTER_KEY_VALUE = 5;
export const MASTERY_TOKEN_VALUE = 20;

export interface ScoreBreakdown {
  playerId: string;
  displayName: string;
  artifactPoints: number;
  goldPoints: number;
  cardPoints: number;
  majorSecretPoints: number;
  minorSecretPoints: number;
  marketPoints: number;
  monkeyIdolPoints: number;
  masteryPoints: number;
  total: number;
  qualified: boolean;
}

function sumCardPoints(cardIds: string[]): number {
  return cardIds.reduce((sum, id) => {
    const def = CARD_BY_ID[baseCardId(id)];
    return sum + (def?.points || 0);
  }, 0);
}

export function didPlayerQualify(player: PlayerRow, gameState: GameState): boolean {
  if (player.has_escaped) return true;
  if (player.is_knocked_out) {
    return !!gameState.rooms && (gameState as any).knockoutAboveGrassLine?.[player.id] === true;
  }
  return false;
}

export function scorePlayer(
  player: PlayerRow,
  gameState: GameState,
  isMasteryWinner: boolean
): ScoreBreakdown {
  const qualified = didPlayerQualify(player, gameState);

  const artifactPoints = qualified ? player.artifacts.reduce((s, a) => s + a.value, 0) : 0;
  const goldPoints = qualified ? player.gold : 0;
  const allCards = [...player.deck, ...player.discard, ...player.hand];
  const cardPoints = qualified ? sumCardPoints(allCards) : 0;

  const tokens = player.tokens || [];
  const majorSecretPoints = qualified ? tokens.filter((t) => t.startsWith("major_secret")).length * MAJOR_SECRET_VALUE : 0;
  const minorSecretPoints = qualified ? tokens.filter((t) => t.startsWith("minor_secret")).length * MINOR_SECRET_VALUE : 0;
  const monkeyIdolPoints = qualified ? tokens.filter((t) => t === "monkey_idol").length * MONKEY_IDOL_VALUE : 0;

  let marketPoints = 0;
  if (qualified) {
    if (tokens.includes("crown")) marketPoints += gameState.market?.crownValue || 8;
    if (tokens.includes("backpack")) marketPoints += BACKPACK_VALUE;
    if (tokens.includes("master_key")) marketPoints += MASTER_KEY_VALUE;
  }

  const masteryPoints = qualified && isMasteryWinner && player.has_escaped ? MASTERY_TOKEN_VALUE : 0;

  const total =
    artifactPoints + goldPoints + cardPoints + majorSecretPoints + minorSecretPoints + marketPoints + monkeyIdolPoints + masteryPoints;

  return {
    playerId: player.id,
    displayName: player.display_name,
    artifactPoints,
    goldPoints,
    cardPoints,
    majorSecretPoints,
    minorSecretPoints,
    marketPoints,
    monkeyIdolPoints,
    masteryPoints,
    total,
    qualified,
  };
}

export function scoreAllPlayers(
  players: PlayerRow[],
  gameState: GameState,
  firstEscapePlayerId: string | null
): ScoreBreakdown[] {
  return players
    .map((p) => scorePlayer(p, gameState, p.id === firstEscapePlayerId))
    .sort((a, b) => b.total - a.total);
}
