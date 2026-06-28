import { EngineContext } from "./engine";
import { scoreAllPlayers } from "./scoring";

/**
 * Once a game transitions to "finished" (countdown reaching 5, or every
 * player having escaped/been knocked out), compute final scores and
 * persist them onto each player row + the shared winners list.
 */
export function finalizeScoresIfGameOver(ctx: EngineContext): void {
  if (ctx.game.status !== "finished") return;
  const breakdowns = scoreAllPlayers(ctx.players, ctx.game.game_state, ctx.game.first_escape_player_id);
  for (const b of breakdowns) {
    const player = ctx.players.find((p) => p.id === b.playerId);
    if (player) player.score = b.total;
  }
  ctx.game.game_state.winners = breakdowns.map((b) => b.playerId);
}
