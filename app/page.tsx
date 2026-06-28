"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getOrCreatePlayerId, getStoredPlayerName, setStoredPlayerName } from "@/lib/identity";
import { api } from "@/lib/api/client";
import { NameEntryForm } from "@/components/NameEntryForm";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate(name: string) {
    setBusy(true);
    try {
      const playerId = getOrCreatePlayerId();
      setStoredPlayerName(name);
      const { game } = await api.createGame(name, playerId);
      router.push(`/game/${game.join_code}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create game.");
      setBusy(false);
    }
  }

  async function handleJoin(name: string) {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      toast.error("Enter a join code.");
      return;
    }
    setBusy(true);
    try {
      const playerId = getOrCreatePlayerId();
      setStoredPlayerName(name);
      await api.joinGame(code, name, playerId);
      router.push(`/game/${code}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to join game.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="font-display text-5xl font-black tracking-wide text-gold-400 drop-shadow-glow">CLANK!</h1>
        <p className="mt-2 text-parchment-300/80">A Deck-Building Dungeon Crawl — Online</p>
      </div>

      <div className="flex gap-2 rounded-full border border-dungeon-700 bg-dungeon-900/70 p-1">
        <button
          onClick={() => setMode("create")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            mode === "create" ? "bg-gold-600 text-dungeon-950" : "text-parchment-300 hover:text-parchment-100"
          }`}
        >
          Create Game
        </button>
        <button
          onClick={() => setMode("join")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            mode === "join" ? "bg-gold-600 text-dungeon-950" : "text-parchment-300 hover:text-parchment-100"
          }`}
        >
          Join Game
        </button>
      </div>

      {mode === "join" && (
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="JOIN CODE"
          className="w-full max-w-sm rounded border border-dungeon-700 bg-dungeon-950 px-3 py-2 text-center font-display text-lg tracking-widest text-parchment-100 outline-none focus:border-gold-500"
        />
      )}

      <NameEntryForm
        title={mode === "create" ? "Create a new dungeon" : "Join the adventure"}
        submitLabel={mode === "create" ? "Create Game" : "Join Game"}
        defaultName={getStoredPlayerName()}
        busy={busy}
        onSubmit={mode === "create" ? handleCreate : handleJoin}
      />

      <p className="max-w-md text-center text-xs text-parchment-300/50">
        2–6 players. No account needed — your name and progress are tied to this browser. Share the join code or link with friends to
        play together.
      </p>
    </main>
  );
}
