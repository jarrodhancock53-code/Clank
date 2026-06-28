import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleRouteError } from "@/lib/api/helpers";
import { GameActionError } from "@/lib/game/types";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  try {
    const supabase = getSupabaseServerClient();
    const code = params.code.toUpperCase().trim();

    const { data: game, error: gameError } = await supabase.from("games").select("*").eq("join_code", code).maybeSingle();
    if (gameError) throw new GameActionError(`Failed to look up game: ${gameError.message}`);
    if (!game) throw new GameActionError("No game found with that join code.");

    const [{ data: players, error: playersError }, { data: dungeonRowRaw, error: rowError }, { data: bag, error: bagError }, { data: turnLog, error: logError }] =
      await Promise.all([
        supabase.from("players").select("*").eq("game_id", game.id).order("turn_order", { ascending: true }),
        supabase.from("dungeon_row").select("*").eq("game_id", game.id).order("slot", { ascending: true }),
        supabase.from("dragon_bag").select("*").eq("game_id", game.id).maybeSingle(),
        supabase.from("turn_log").select("*").eq("game_id", game.id).order("created_at", { ascending: false }).limit(100),
      ]);

    if (playersError) throw new GameActionError(`Failed to load players: ${playersError.message}`);
    if (rowError) throw new GameActionError(`Failed to load dungeon row: ${rowError.message}`);
    if (bagError) throw new GameActionError(`Failed to load dragon bag: ${bagError.message}`);
    if (logError) throw new GameActionError(`Failed to load turn log: ${logError.message}`);

    const dungeonRow: (string | null)[] = [null, null, null, null, null, null];
    for (const r of dungeonRowRaw || []) {
      if (r.slot >= 0 && r.slot <= 5) dungeonRow[r.slot] = r.card_id;
    }

    return NextResponse.json({
      game,
      players: players || [],
      dungeonRow,
      dragonBagCubes: bag?.cubes || [],
      turnLog: (turnLog || []).slice().reverse(),
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
