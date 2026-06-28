import { NextResponse } from "next/server";
import { handleRouteError, readJsonBody, requireField } from "@/lib/api/helpers";
import { appendTurnLog, loadEngineContextByGameId, persistEngineContext } from "@/lib/game/db";
import { endTurn } from "@/lib/game/engine";
import { finalizeScoresIfGameOver } from "@/lib/game/finish";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const gameId = requireField<string>(body, "gameId");
    const playerId = requireField<string>(body, "playerId");

    const ctx = await loadEngineContextByGameId(gameId);
    const turnNumberForLog = ctx.game.turn_number;
    const { logs, gameOver } = endTurn(ctx, playerId);
    finalizeScoresIfGameOver(ctx);
    await persistEngineContext(ctx);
    await appendTurnLog(gameId, playerId, turnNumberForLog, logs);

    return NextResponse.json({ ok: true, logs, gameOver, game: ctx.game, players: ctx.players, dungeonRow: ctx.dungeonRow });
  } catch (e) {
    return handleRouteError(e);
  }
}
