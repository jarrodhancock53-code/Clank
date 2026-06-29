"use client";

import { PLAYER_COLOR_HEX } from "@/lib/game/board";

export function SeatSwitcher({
  seats,
  onChoose,
  onClose,
}: {
  seats: { id: string; name: string; color: string }[];
  onChoose: (playerId: string) => void;
  onClose?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="parchment-panel glow-border w-full max-w-sm rounded-lg p-6 text-center">
        <h2 className="mb-2 font-display text-xl font-bold text-gold-400">Pass the Device</h2>
        <p className="mb-4 text-sm text-parchment-300">Whoever is holding the device now — tap your name to continue.</p>
        <div className="space-y-2">
          {seats.map((s) => (
            <button
              key={s.id}
              onClick={() => onChoose(s.id)}
              className="flex w-full items-center gap-2 rounded border border-dungeon-700 px-4 py-2.5 text-left hover:border-gold-500 hover:bg-dungeon-800"
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: PLAYER_COLOR_HEX[s.color] }} />
              <span className="font-display font-semibold">{s.name}</span>
            </button>
          ))}
        </div>
        {onClose && (
          <button onClick={onClose} className="mt-4 rounded border border-dungeon-700 px-4 py-2 text-sm hover:bg-dungeon-800">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
