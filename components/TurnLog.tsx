"use client";

import { useEffect, useRef } from "react";
import { TurnLogRow } from "@/lib/game/types";

export function TurnLog({ entries }: { entries: TurnLogRow[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries]);

  const lines = entries.flatMap((e) => e.actions.map((a, i) => ({ key: `${e.id}-${i}`, text: a, turn: e.turn_number })));

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-1 font-display text-sm font-semibold text-gold-400">Turn Log</h3>
      <div className="flex-1 space-y-1 overflow-y-auto rounded border border-dungeon-700 bg-dungeon-900/60 p-2 text-[11px] leading-snug text-parchment-200/90">
        {lines.length === 0 && <p className="italic text-parchment-300/50">Nothing has happened yet.</p>}
        {lines.map((l) => (
          <p key={l.key}>{l.text}</p>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
