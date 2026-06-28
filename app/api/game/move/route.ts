import { NextResponse } from "next/server";
import { handleRouteError, readJsonBody, requireField } from "@/lib/api/helpers";
import { appendTurnLog, loadEngineContextByGameId, persistEngineContext } from "@/lib/game/db";
import { moveAction } from "@/lib/game/engine";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const gameId = requireField<string>(body, "gameId");
    const playerId = requireField<string>(body, "playerId");
    const toRoomId = requireField<string>(body, "toRoomId");
    const paySwordsForMonster = !!body.paySwordsForMonster;
    const useTeleportCharge = !!body.useTeleportCharge;

    const ctx = await loadEngineContextByGameId(gameId);
    const logs = moveAction(ctx, playerId, toRoomId, { paySwordsForMonster, useTeleportCharge });
    await persistEngineContext(ctx);
    await appendTurnLog(gameId, playerId, ctx.game.turn_number, logs);

    return NextResponse.json({ ok: true, logs, game: ctx.game, players: ctx.players, dungeonRow: ctx.dungeonRow });
  } catch (e) {
    return handleRouteError(e);
  }
}
