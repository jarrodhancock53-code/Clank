import { NextResponse } from "next/server";
import { handleRouteError, readJsonBody, requireField } from "@/lib/api/helpers";
import { appendTurnLog, loadEngineContextByGameId, persistEngineContext } from "@/lib/game/db";
import { reactPlay } from "@/lib/game/engine";
import { GameActionError } from "@/lib/game/types";

// Assassin's REACT ability: any player holding an Assassin may play a
// card from hand the instant a monster arrives in the Dungeon Row, even
// outside their own turn.
export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const gameId = requireField<string>(body, "gameId");
    const playerId = requireField<string>(body, "playerId");
    const opportunityId = requireField<string>(body, "opportunityId");
    const cardInstanceId = requireField<string>(body, "cardInstanceId");

    const ctx = await loadEngineContextByGameId(gameId);
    if (ctx.game.status !== "active") throw new GameActionError("Game is not active.");

    const logs = reactPlay(ctx, playerId, opportunityId, cardInstanceId);
    await persistEngineContext(ctx);
    await appendTurnLog(gameId, playerId, ctx.game.turn_number, logs);

    return NextResponse.json({ ok: true, logs, game: ctx.game, players: ctx.players });
  } catch (e) {
    return handleRouteError(e);
  }
}
