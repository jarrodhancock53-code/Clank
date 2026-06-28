"use client";

import { ReactOpportunity } from "@/lib/game/types";
import { Card } from "./Card";

export function ReactPrompt({
  opportunity,
  hand,
  busy,
  onPlay,
  onDecline,
}: {
  opportunity: ReactOpportunity;
  hand: string[];
  busy: boolean;
  onPlay: (cardInstanceId: string) => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="parchment-panel glow-border max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg p-5">
        <h3 className="mb-2 font-display text-lg font-bold text-blood-400">Assassin REACT!</h3>
        <p className="mb-4 text-sm text-parchment-300">
          {opportunity.monsterName} just arrived in the Dungeon Row. You may immediately play one card from your hand (Gold, Clank, draw,
          heal, and trash effects only — Skill/Sword/Boot resources are not collected outside your own turn).
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {hand.map((id) => (
            <Card key={id} instanceId={id} size="sm" disabled={busy} onClick={() => onPlay(id)} />
          ))}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onDecline}
            disabled={busy}
            className="rounded border border-dungeon-700 px-4 py-2 text-sm hover:bg-dungeon-800 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
