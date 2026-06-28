import { DRAGON_RAGE_DRAW_TABLE, DragonAttackResult, PlayerRow } from "./types";

export const STARTING_BLACK_CUBES = 24;

export function buildInitialDragonBag(): string[] {
  return Array.from({ length: STARTING_BLACK_CUBES }, () => "black");
}

export function cubesToDrawForRage(rage: number): number {
  const clamped = Math.max(0, Math.min(9, rage));
  return DRAGON_RAGE_DRAW_TABLE[clamped] ?? 1;
}

function shuffleCubes(cubes: string[], rng: () => number = Math.random): string[] {
  const a = [...cubes];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Executes a Dragon Attack: sweeps every cube currently staged in the
 * clank area into the bag, then draws `cubesToDraw` cubes. Colored cubes
 * deal 1 damage to the matching player; black cubes are set aside with
 * no effect. Returns the new bag contents (after removing drawn cubes)
 * and the result for damage application + logging.
 */
export function executeDragonAttack(
  bag: string[],
  clankArea: Record<string, number>,
  players: Pick<PlayerRow, "id" | "color">[],
  cubesToDraw: number,
  rng: () => number = Math.random
): { newBag: string[]; result: DragonAttackResult } {
  const colorToPlayer: Record<string, string> = {};
  for (const p of players) colorToPlayer[p.color] = p.id;

  let sweptBag = [...bag];
  for (const [playerId, count] of Object.entries(clankArea)) {
    const player = players.find((p) => p.id === playerId);
    if (!player || count <= 0) continue;
    for (let i = 0; i < count; i++) sweptBag.push(player.color);
  }

  sweptBag = shuffleCubes(sweptBag, rng);

  const drawCount = Math.min(cubesToDraw, sweptBag.length);
  const drawn = sweptBag.slice(0, drawCount);
  const remaining = sweptBag.slice(drawCount);

  const damageByPlayer: Record<string, number> = {};
  let blackCount = 0;
  for (const cube of drawn) {
    if (cube === "black") {
      blackCount++;
      continue;
    }
    const playerId = colorToPlayer[cube];
    if (playerId) {
      damageByPlayer[playerId] = (damageByPlayer[playerId] || 0) + 1;
    }
  }

  return {
    newBag: remaining,
    result: { cubesDrawn: drawn, damageByPlayer, blackCount },
  };
}

export function describeDragonAttack(
  result: DragonAttackResult,
  players: Pick<PlayerRow, "id" | "display_name" | "color">[]
): string {
  const colorCounts: Record<string, number> = {};
  for (const c of result.cubesDrawn) colorCounts[c] = (colorCounts[c] || 0) + 1;

  const parts: string[] = [];
  for (const [color, count] of Object.entries(colorCounts)) {
    if (color === "black") {
      parts.push(`${count} black`);
    } else {
      const player = players.find((p) => p.color === color);
      parts.push(`${count} ${color}${player ? ` (${player.display_name} takes ${count} damage)` : ""}`);
    }
  }

  return `Dragon Attack! ${result.cubesDrawn.length} cubes drawn: ${parts.join(", ")}.`;
}
