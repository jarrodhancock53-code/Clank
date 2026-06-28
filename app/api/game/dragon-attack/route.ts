import { NextResponse } from "next/server";
import { handleRouteError, readJsonBody, requireField } from "@/lib/api/helpers";
import { appendTurnLog, loadEngineContextByGameId, persistEngineContext } from "@/lib/game/db";
import { manualDragonAttack } from "@/lib/game/engine";
import { GameActionError } from "@/lib/game/types";

// Host-triggered (or debug) manual Dragon Attack. Real attacks normally
// fire automatically from Dragon markers in the deck, the Countdown
// Track, or the Alarm Crystal device — this route exists for the rare
// case where the host needs to force one (e.g. recovering a stuck game).
export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const gameId = requireField<string>(body, "gameId");
    const playerId = requireField<string>(body, "playerId");

    const ctx = await loadEngineContextByGameId(gameId);
    if (ctx.game.host_player_id !== playerId) throw new GameActionError("Only the host can manually trigger a Dragon Attack.");
    if (ctx.game.status !== "active") throw new GameActionError("Game is not active.");

    const { logs } = manualDragonAttack(ctx);
    await persistEngineContext(ctx);
    await appendTurnLog(gameId, playerId, ctx.game.turn_number, logs);

    return NextResponse.json({ ok: true, logs, game: ctx.game, players: ctx.players });
  } catch (e) {
    return handleRouteError(e);
  }
}
