import { NextResponse } from "next/server";
import { handleRouteError, readJsonBody, requireField } from "@/lib/api/helpers";
import { appendTurnLog, loadEngineContextByGameId, persistEngineContext } from "@/lib/game/db";
import { fightMonster } from "@/lib/game/engine";
import { GameActionError } from "@/lib/game/types";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const gameId = requireField<string>(body, "gameId");
    const playerId = requireField<string>(body, "playerId");
    const source = requireField<"row" | "reserve">(body, "source");
    if (source !== "row" && source !== "reserve") throw new GameActionError("Invalid source.");
    const slot = source === "row" ? requireField<number>(body, "slot") : undefined;

    const ctx = await loadEngineContextByGameId(gameId);
    const logs = fightMonster(ctx, playerId, source, slot);
    await persistEngineContext(ctx);
    await appendTurnLog(gameId, playerId, ctx.game.turn_number, logs);

    return NextResponse.json({ ok: true, logs, game: ctx.game, players: ctx.players, dungeonRow: ctx.dungeonRow });
  } catch (e) {
    return handleRouteError(e);
  }
}
