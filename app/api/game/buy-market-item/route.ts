import { NextResponse } from "next/server";
import { handleRouteError, readJsonBody, requireField } from "@/lib/api/helpers";
import { appendTurnLog, loadEngineContextByGameId, persistEngineContext } from "@/lib/game/db";
import { buyMarketItem } from "@/lib/game/engine";
import { GameActionError } from "@/lib/game/types";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const gameId = requireField<string>(body, "gameId");
    const playerId = requireField<string>(body, "playerId");
    const item = requireField<"crown" | "backpack" | "master_key">(body, "item");
    if (!["crown", "backpack", "master_key"].includes(item)) throw new GameActionError("Invalid market item.");

    const ctx = await loadEngineContextByGameId(gameId);
    const logs = buyMarketItem(ctx, playerId, item);
    await persistEngineContext(ctx);
    await appendTurnLog(gameId, playerId, ctx.game.turn_number, logs);

    return NextResponse.json({ ok: true, logs, game: ctx.game, players: ctx.players });
  } catch (e) {
    return handleRouteError(e);
  }
}
