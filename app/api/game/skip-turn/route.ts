import { NextResponse } from "next/server";
import { handleRouteError, readJsonBody, requireField } from "@/lib/api/helpers";
import { appendTurnLog, loadEngineContextByGameId, persistEngineContext } from "@/lib/game/db";
import { skipTurn } from "@/lib/game/engine";
import { finalizeScoresIfGameOver } from "@/lib/game/finish";
import { GameActionError } from "@/lib/game/types";

// Any player at the table may force-skip the current player's turn once
// they've gone quiet (the client only surfaces this button after the
// active player's last_seen_at is more than 24h stale).
export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const gameId = requireField<string>(body, "gameId");
    const playerId = requireField<string>(body, "playerId");

    const ctx = await loadEngineContextByGameId(gameId);
    if (!ctx.players.some((p) => p.id === playerId)) throw new GameActionError("You are not a player in this game.");

    const turnNumberForLog = ctx.game.turn_number;
    const { logs, gameOver } = skipTurn(ctx);
    finalizeScoresIfGameOver(ctx);
    await persistEngineContext(ctx);
    await appendTurnLog(gameId, null, turnNumberForLog, logs);

    return NextResponse.json({ ok: true, logs, gameOver, game: ctx.game, players: ctx.players, dungeonRow: ctx.dungeonRow });
  } catch (e) {
    return handleRouteError(e);
  }
}
