import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleRouteError, readJsonBody, requireField } from "@/lib/api/helpers";
import { PLAYER_COLORS } from "@/lib/game/board";
import { GameActionError } from "@/lib/game/types";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const joinCode = requireField<string>(body, "joinCode");
    const displayName = requireField<string>(body, "displayName");
    const playerId = requireField<string>(body, "playerId");

    const supabase = getSupabaseServerClient();

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("join_code", joinCode.toUpperCase().trim())
      .maybeSingle();
    if (gameError) throw new GameActionError(`Failed to look up game: ${gameError.message}`);
    if (!game) throw new GameActionError("No game found with that join code.");

    const { data: existingPlayers, error: playersError } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", game.id)
      .order("turn_order", { ascending: true });
    if (playersError) throw new GameActionError(`Failed to load players: ${playersError.message}`);

    const reconnecting = (existingPlayers || []).find((p) => p.id === playerId);
    if (reconnecting) {
      return NextResponse.json({ game, player: reconnecting, players: existingPlayers });
    }

    if (game.status !== "lobby") {
      throw new GameActionError("This game has already started — you can only rejoin with the same device/browser you joined with.");
    }
    if ((existingPlayers || []).length >= 6) {
      throw new GameActionError("This game already has the maximum of 6 players.");
    }

    const usedColors = new Set((existingPlayers || []).map((p) => p.color));
    const color = PLAYER_COLORS.find((c) => !usedColors.has(c)) || PLAYER_COLORS[0];

    const { data: player, error: insertError } = await supabase
      .from("players")
      .insert({
        id: playerId,
        game_id: game.id,
        display_name: displayName.slice(0, 24),
        color,
        turn_order: (existingPlayers || []).length,
        is_host: false,
      })
      .select("*")
      .single();
    if (insertError || !player) throw new GameActionError(`Failed to join game: ${insertError?.message}`);

    return NextResponse.json({ game, player, players: [...(existingPlayers || []), player] });
  } catch (e) {
    return handleRouteError(e);
  }
}
