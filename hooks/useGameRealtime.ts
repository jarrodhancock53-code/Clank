"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Subscribes to every table that makes up a game's live state and calls
 * `onChange` (debounced) whenever any row touching this game is
 * inserted/updated/deleted. Callers re-fetch the full game snapshot on
 * each call rather than trying to reconcile partial Postgres payloads,
 * which keeps the client simple and correct at this app's scale.
 */
export function useGameRealtime(gameId: string | undefined, onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!gameId) return;
    const supabase = getSupabaseBrowserClient();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => onChangeRef.current(), 150);
    };

    const channel = supabase
      .channel(`game-${gameId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` }, trigger)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `game_id=eq.${gameId}` }, trigger)
      .on("postgres_changes", { event: "*", schema: "public", table: "dungeon_row", filter: `game_id=eq.${gameId}` }, trigger)
      .on("postgres_changes", { event: "*", schema: "public", table: "dragon_bag", filter: `game_id=eq.${gameId}` }, trigger)
      .on("postgres_changes", { event: "*", schema: "public", table: "turn_log", filter: `game_id=eq.${gameId}` }, trigger)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [gameId]);
}
