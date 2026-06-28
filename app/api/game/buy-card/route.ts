import { NextResponse } from "next/server";
import { handleRouteError, readJsonBody, requireField } from "@/lib/api/helpers";
import { appendTurnLog, loadEngineContextByGameId, persistEngineContext } from "@/lib/game/db";
import { buyCard } from "@/lib/game/engine";
import { GameActionError } from "@/lib/game/types";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const gameId = requireField<string>(body, "gameId");
    const playerId = requireField<string>(body, "playerId");
    const source = requireField<"row" | "reserve">(body, "source");
    if (source !== "row" && source !== "reserve") throw new GameActionError("Invalid source.");
    const identifier = source === "row" ? requireField<number>(body, "slot") : requireField<string>(body, "cardId");

    const ctx = await loadEngineContextByGameId(gameId);
    const logs = buyCard(ctx, playerId, source, identifier);
    await persistEngineContext(ctx);
    await appendTurnLog(gameId, playerId, ctx.game.turn_number, logs);

    return NextResponse.json({ ok: true, logs, game: ctx.game, players: ctx.players, dungeonRow: ctx.dungeonRow });
  } catch (e) {
    return handleRouteError(e);
  }
}
