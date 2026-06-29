import { getSupabaseServerClient } from "@/lib/supabase/server";
import { EngineContext } from "./engine";
import { GameActionError, GameRow, PlayerRow } from "./types";

const JOIN_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid ambiguity

export function generateJoinCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += JOIN_CODE_CHARS[Math.floor(Math.random() * JOIN_CODE_CHARS.length)];
  }
  return code;
}

export async function loadEngineContextByGameId(gameId: string): Promise<EngineContext> {
  const supabase = getSupabaseServerClient();
  const [gameRes, playersRes, rowRes, bagRes] = await Promise.all([
    supabase.from("games").select("*").eq("id", gameId).single(),
    supabase.from("players").select("*").eq("game_id", gameId).order("turn_order", { ascending: true }),
    supabase.from("dungeon_row").select("*").eq("game_id", gameId).order("slot", { ascending: true }),
    supabase.from("dragon_bag").select("*").eq("game_id", gameId).single(),
  ]);

  if (gameRes.error || !gameRes.data) throw new GameActionError("Game not found.");
  if (playersRes.error) throw new GameActionError("Failed to load players.");
  if (rowRes.error) throw new GameActionError("Failed to load the dungeon row.");
  // bagRes uses .single() and legitimately has no row until the game starts
  // (PGRST116 = no rows found); any other error means a real query failure.
  if (bagRes.error && bagRes.error.code !== "PGRST116") throw new GameActionError("Failed to load the dragon bag.");

  const dungeonRow: (string | null)[] = [null, null, null, null, null, null];
  for (const r of rowRes.data || []) {
    if (r.slot >= 0 && r.slot <= 5) dungeonRow[r.slot] = r.card_id;
  }

  return {
    game: gameRes.data as GameRow,
    players: (playersRes.data || []) as PlayerRow[],
    dungeonRow,
    dragonBag: ((bagRes.data?.cubes as string[]) || []) as string[],
  };
}

export async function persistEngineContext(ctx: EngineContext): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { id, status, current_player_index, player_order, game_state, turn_number, dragon_rage, countdown_track, first_escape_player_id } =
    ctx.game;

  const ops: PromiseLike<any>[] = [
    supabase
      .from("games")
      .update({
        status,
        current_player_index,
        player_order,
        game_state,
        turn_number,
        dragon_rage,
        countdown_track,
        first_escape_player_id,
      })
      .eq("id", id),
    supabase.from("dragon_bag").upsert({ game_id: id, cubes: ctx.dragonBag }),
  ];

  for (const p of ctx.players) {
    ops.push(
      supabase
        .from("players")
        .update({
          position: p.position,
          hand: p.hand,
          deck: p.deck,
          discard: p.discard,
          clank_cubes_in_supply: p.clank_cubes_in_supply,
          clank_cubes_on_board: p.clank_cubes_on_board,
          health: p.health,
          gold: p.gold,
          artifacts: p.artifacts,
          tokens: p.tokens,
          has_escaped: p.has_escaped,
          is_knocked_out: p.is_knocked_out,
          score: p.score,
        })
        .eq("id", p.id)
    );
  }

  for (let slot = 0; slot < ctx.dungeonRow.length; slot++) {
    ops.push(supabase.from("dungeon_row").upsert({ game_id: id, slot, card_id: ctx.dungeonRow[slot] }));
  }

  const results = await Promise.all(ops);
  const failed = results.find((r) => r?.error);
  if (failed?.error) throw new GameActionError(`Failed to save game state: ${failed.error.message}`);
}

export async function appendTurnLog(gameId: string, playerId: string | null, turnNumber: number, actions: string[]): Promise<void> {
  if (actions.length === 0) return;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("turn_log").insert({ game_id: gameId, player_id: playerId, turn_number: turnNumber, actions });
  if (error) throw new GameActionError(`Failed to write turn log: ${error.message}`);
}
