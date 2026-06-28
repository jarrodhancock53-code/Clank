import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleRouteError, readJsonBody, requireField } from "@/lib/api/helpers";
import { initializeGame } from "@/lib/game/engine";
import { GameActionError, PlayerRow } from "@/lib/game/types";

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    const gameId = requireField<string>(body, "gameId");
    const playerId = requireField<string>(body, "playerId");

    const supabase = getSupabaseServerClient();

    const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).single();
    if (gameError || !game) throw new GameActionError("Game not found.");
    if (game.status !== "lobby") throw new GameActionError("This game has already started.");
    if (game.host_player_id !== playerId) throw new GameActionError("Only the host can start the game.");

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("*")
      .eq("game_id", gameId)
      .order("turn_order", { ascending: true });
    if (playersError || !players) throw new GameActionError("Failed to load players.");
    if (players.length < 2) throw new GameActionError("At least 2 players are required to start.");
    if (players.length > 6) throw new GameActionError("A game can have at most 6 players.");

    const playerRows = players as PlayerRow[];
    const { gameState, dungeonRow, dragonBagCubes } = initializeGame(playerRows);

    const playerOrder = playerRows.map((p) => p.id);

    const { data: updatedGame, error: updateError } = await supabase
      .from("games")
      .update({
        status: "active",
        current_player_index: 0,
        player_order: playerOrder,
        game_state: gameState,
        turn_number: 1,
        dragon_rage: 0,
        countdown_track: null,
        first_escape_player_id: null,
      })
      .eq("id", gameId)
      .select("*")
      .single();
    if (updateError || !updatedGame) throw new GameActionError(`Failed to start game: ${updateError?.message}`);

    await Promise.all([
      ...playerRows.map((p) =>
        supabase
          .from("players")
          .update({
            deck: p.deck,
            hand: p.hand,
            discard: p.discard,
            position: p.position,
            health: p.health,
            gold: p.gold,
            artifacts: p.artifacts,
            tokens: p.tokens,
            has_escaped: p.has_escaped,
            is_knocked_out: p.is_knocked_out,
            score: p.score,
            clank_cubes_in_supply: p.clank_cubes_in_supply,
            clank_cubes_on_board: p.clank_cubes_on_board,
          })
          .eq("id", p.id)
      ),
      ...dungeonRow.map((cardId, slot) => supabase.from("dungeon_row").upsert({ game_id: gameId, slot, card_id: cardId })),
      supabase.from("dragon_bag").upsert({ game_id: gameId, cubes: dragonBagCubes }),
      supabase.from("turn_log").insert({
        game_id: gameId,
        player_id: null,
        turn_number: 1,
        actions: [`The game has begun! ${playerRows[0].display_name} goes first.`],
      }),
    ]);

    return NextResponse.json({ game: updatedGame });
  } catch (e) {
    return handleRouteError(e);
  }
}
