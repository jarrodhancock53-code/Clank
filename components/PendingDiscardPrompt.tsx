"use client";

import { Card } from "./Card";

export function PendingDiscardPrompt({
  hand,
  busy,
  onDiscard,
}: {
  hand: string[];
  busy: boolean;
  onDiscard: (cardInstanceId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="parchment-panel glow-border max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg p-5">
        <h3 className="mb-2 font-display text-lg font-bold text-gold-400">Wand of Recalling</h3>
        <p className="mb-4 text-sm text-parchment-300">You drew 2 cards. Choose 1 card from your hand to discard.</p>
        <div className="flex flex-wrap gap-2">
          {hand.map((id) => (
            <Card key={id} instanceId={id} size="sm" disabled={busy} onClick={() => onDiscard(id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
