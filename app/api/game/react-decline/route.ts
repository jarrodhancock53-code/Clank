import { NextResponse } from "next/server";
import { handleRouteError, readJsonBody, requireField } from "@/lib/api/helpers";
import { loadEngineContextByGameId, persistEngineContext } from "@/lib/game/db";
import { declineReact } from "@/lib/game/engine";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const gameId = requireField<string>(body, "gameId");
    const playerId = requireField<string>(body, "playerId");
    const opportunityId = requireField<string>(body, "opportunityId");

    const ctx = await loadEngineContextByGameId(gameId);
    declineReact(ctx, playerId, opportunityId);
    await persistEngineContext(ctx);

    return NextResponse.json({ ok: true, game: ctx.game });
  } catch (e) {
    return handleRouteError(e);
  }
}
