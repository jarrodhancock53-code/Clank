import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { generateJoinCode } from "@/lib/game/db";
import { handleRouteError, readJsonBody, requireField } from "@/lib/api/helpers";
import { PLAYER_COLORS } from "@/lib/game/board";
import { GameActionError } from "@/lib/game/types";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const displayName = requireField<string>(body, "displayName");
    const playerId = requireField<string>(body, "playerId");

    const supabase = getSupabaseServerClient();

    let joinCode = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateJoinCode();
      const { data: existing } = await supabase.from("games").select("id").eq("join_code", candidate).maybeSingle();
      if (!existing) {
        joinCode = candidate;
        break;
      }
    }
    if (!joinCode) throw new GameActionError("Could not generate a unique join code. Please try again.");

    const { data: game, error: gameError } = await supabase
      .from("games")
      .insert({ join_code: joinCode, status: "lobby" })
      .select("*")
      .single();
    if (gameError || !game) throw new GameActionError(`Failed to create game: ${gameError?.message}`);

    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        id: playerId,
        game_id: game.id,
        display_name: displayName.slice(0, 24),
        color: PLAYER_COLORS[0],
        turn_order: 0,
        is_host: true,
      })
      .select("*")
      .single();
    if (playerError || !player) throw new GameActionError(`Failed to create host player: ${playerError?.message}`);

    const { data: updatedGame, error: updateError } = await supabase
      .from("games")
      .update({ host_player_id: playerId })
      .eq("id", game.id)
      .select("*")
      .single();
    if (updateError) throw new GameActionError(`Failed to finalize game: ${updateError.message}`);

    return NextResponse.json({ game: updatedGame || game, player });
  } catch (e) {
    return handleRouteError(e);
  }
}
