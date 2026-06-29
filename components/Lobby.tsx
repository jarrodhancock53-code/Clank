"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { PLAYER_COLOR_HEX } from "@/lib/game/board";
import { GameRow, PlayerRow } from "@/lib/game/types";

export function Lobby({
  game,
  players,
  myPlayerId,
  busy,
  onStart,
  onAddLocalPlayer,
}: {
  game: GameRow;
  players: PlayerRow[];
  myPlayerId: string;
  busy: boolean;
  onStart: () => void;
  onAddLocalPlayer: (name: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [localName, setLocalName] = useState("");
  const isHost = game.host_player_id === myPlayerId;
  const canStart = players.length >= 2 && players.length <= 6;
  const canAddMore = players.length < 6;

  function copyLink() {
    const url = `${window.location.origin}/game/${game.join_code}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        toast.success("Invite link copied!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Could not copy link."));
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="font-display text-3xl font-black text-gold-400">Waiting in the Tavern…</h1>
        <p className="mt-2 text-parchment-300/80">Share this code so friends can join your dungeon run.</p>
      </div>

      <div className="parchment-panel glow-border flex flex-col items-center gap-3 rounded-lg p-6">
        <span className="font-display text-4xl font-black tracking-[0.3em] text-gold-300">{game.join_code}</span>
        <button onClick={copyLink} className="rounded border border-gold-600 px-3 py-1 text-sm text-gold-300 hover:bg-gold-700/20">
          {copied ? "Copied!" : "Copy invite link"}
        </button>
      </div>

      <div className="w-full max-w-sm">
        <h3 className="mb-2 font-display text-sm font-semibold text-gold-400">Players ({players.length}/6)</h3>
        <div className="space-y-1.5">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded border border-dungeon-700 bg-dungeon-900/50 px-3 py-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PLAYER_COLOR_HEX[p.color] }} />
              <span className="text-sm">
                {p.display_name}
                {p.id === myPlayerId ? " (you)" : ""}
              </span>
              {p.is_host && <span className="ml-auto text-[10px] font-bold text-gold-400">HOST</span>}
            </div>
          ))}
        </div>
      </div>

      {canAddMore && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = localName.trim();
            if (!trimmed) return;
            onAddLocalPlayer(trimmed);
            setLocalName("");
          }}
          className="flex w-full max-w-sm flex-col gap-2"
        >
          <p className="text-center text-xs text-parchment-300/60">
            Passing the device around in person? Add the other players right here instead of sharing a link.
          </p>
          <div className="flex gap-2">
            <input
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              maxLength={24}
              placeholder="Another player's name"
              className="flex-1 rounded border border-dungeon-700 bg-dungeon-950 px-3 py-2 text-sm text-parchment-100 outline-none focus:border-gold-500"
            />
            <button
              type="submit"
              disabled={!localName.trim() || busy}
              className="rounded border border-gold-600 px-3 py-2 text-sm text-gold-300 hover:bg-gold-700/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add to this device
            </button>
          </div>
        </form>
      )}

      {isHost ? (
        <button
          onClick={onStart}
          disabled={!canStart || busy}
          className="rounded bg-gold-600 px-8 py-3 font-display text-lg font-bold text-dungeon-950 transition hover:bg-gold-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Starting…" : canStart ? "Start Game" : "Need at least 2 players"}
        </button>
      ) : (
        <p className="text-parchment-300/70">Waiting for the host to start the game…</p>
      )}
    </main>
  );
}
