"use client";

import { useState } from "react";
import { ROOMS } from "@/lib/game/board";
import { PlayerRow, RoomTokenState } from "@/lib/game/types";
import { Card } from "./Card";

export type ChoiceRequest =
  | { kind: "discard_for_draw"; cardInstanceId: string; hand: string[] }
  | { kind: "reorder_top3"; cardInstanceId: string; top3: string[] }
  | { kind: "device_teleport"; slot: number }
  | { kind: "device_burglar"; slot: number; rooms: Record<string, RoomTokenState> }
  | { kind: "device_catapult"; slot: number; players: PlayerRow[] }
  | { kind: "tunnel_monster"; toRoomId: string; toRoomLabel: string; damage: number; swordsAvailable: number };

export function ChoiceModal({
  request,
  onConfirm,
  onCancel,
}: {
  request: ChoiceRequest;
  onConfirm: (choices: Record<string, any> | undefined) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="parchment-panel glow-border max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg p-5">
        {request.kind === "discard_for_draw" && <DiscardForDraw request={request} onConfirm={onConfirm} onCancel={onCancel} />}
        {request.kind === "reorder_top3" && <ReorderTop3 request={request} onConfirm={onConfirm} onCancel={onCancel} />}
        {request.kind === "device_teleport" && <RoomPicker title="Crystal Heart — Teleport Anywhere" onConfirm={onConfirm} onCancel={onCancel} />}
        {request.kind === "device_burglar" && <BurglarPicker request={request} onConfirm={onConfirm} onCancel={onCancel} />}
        {request.kind === "device_catapult" && <CatapultPicker request={request} onConfirm={onConfirm} onCancel={onCancel} />}
        {request.kind === "tunnel_monster" && <TunnelMonsterChoice request={request} onConfirm={onConfirm} onCancel={onCancel} />}
      </div>
    </div>
  );
}

function DiscardForDraw({
  request,
  onConfirm,
  onCancel,
}: {
  request: { hand: string[] };
  onConfirm: (choices: Record<string, any> | undefined) => void;
  onCancel: () => void;
}) {
  return (
    <div>
      <h3 className="mb-3 font-display text-lg font-bold text-gold-400">Sleight of Hand</h3>
      <p className="mb-3 text-sm text-parchment-300">Discard 1 card from your hand to draw 2? (optional)</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {request.hand.map((id) => (
          <Card key={id} instanceId={id} size="sm" onClick={() => onConfirm({ discardCardId: id })} />
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={() => onConfirm(undefined)} className="rounded border border-dungeon-700 px-4 py-2 text-sm hover:bg-dungeon-800">
          Skip
        </button>
        <button onClick={onCancel} className="rounded border border-blood-600 px-4 py-2 text-sm text-blood-400 hover:bg-blood-600/10">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ReorderTop3({
  request,
  onConfirm,
  onCancel,
}: {
  request: { top3: string[] };
  onConfirm: (choices: Record<string, any> | undefined) => void;
  onCancel: () => void;
}) {
  const [order, setOrder] = useState(request.top3);

  function move(index: number, dir: -1 | 1) {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  return (
    <div>
      <h3 className="mb-3 font-display text-lg font-bold text-gold-400">Magic Map</h3>
      <p className="mb-3 text-sm text-parchment-300">Top of the Dungeon deck (top card drawn first). Rearrange if you like.</p>
      <div className="mb-4 flex flex-wrap gap-3">
        {order.map((id, i) => (
          <div key={id} className="flex flex-col items-center gap-1">
            <Card instanceId={id} size="sm" />
            <div className="flex gap-1">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded bg-dungeon-800 px-2 text-xs disabled:opacity-30">
                ↑
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === order.length - 1}
                className="rounded bg-dungeon-800 px-2 text-xs disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded border border-dungeon-700 px-4 py-2 text-sm hover:bg-dungeon-800">
          Cancel
        </button>
        <button
          onClick={() => onConfirm({ reorder: order })}
          className="rounded bg-gold-600 px-4 py-2 text-sm font-semibold text-dungeon-950 hover:bg-gold-500"
        >
          Confirm Order
        </button>
      </div>
    </div>
  );
}

function RoomPicker({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: (choices: Record<string, any> | undefined) => void;
  onCancel: () => void;
}) {
  return (
    <div>
      <h3 className="mb-3 font-display text-lg font-bold text-gold-400">{title}</h3>
      <p className="mb-3 text-sm text-parchment-300">Choose a destination room.</p>
      <div className="mb-4 grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto">
        {ROOMS.map((r) => (
          <button
            key={r.id}
            onClick={() => onConfirm({ targetRoom: r.id })}
            className="rounded border border-dungeon-700 px-2 py-1.5 text-left text-xs hover:border-gold-500 hover:bg-dungeon-800"
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={onCancel} className="rounded border border-dungeon-700 px-4 py-2 text-sm hover:bg-dungeon-800">
          Cancel
        </button>
      </div>
    </div>
  );
}

function BurglarPicker({
  request,
  onConfirm,
  onCancel,
}: {
  request: { rooms: Record<string, RoomTokenState> };
  onConfirm: (choices: Record<string, any> | undefined) => void;
  onCancel: () => void;
}) {
  const targets = ROOMS.map((r) => {
    const ts = request.rooms[r.id];
    if (ts?.majorSecret) return { room: r, type: "majorSecret" as const, label: `${r.label} — Major Secret` };
    if (ts?.minorSecret) return { room: r, type: "minorSecret" as const, label: `${r.label} — Minor Secret` };
    if (ts?.monkeyIdols && ts.monkeyIdols > 0) return { room: r, type: "monkeyIdols" as const, label: `${r.label} — Monkey Idol` };
    return null;
  }).filter((x): x is { room: typeof ROOMS[number]; type: "majorSecret" | "minorSecret" | "monkeyIdols"; label: string } => !!x);

  return (
    <div>
      <h3 className="mb-3 font-display text-lg font-bold text-gold-400">Master Burglar Kit</h3>
      <p className="mb-3 text-sm text-parchment-300">Take any one secret token from any room on the board.</p>
      <div className="mb-4 max-h-64 space-y-1.5 overflow-y-auto">
        {targets.length === 0 && <p className="text-sm italic text-parchment-300/60">No tokens remain on the board.</p>}
        {targets.map((t) => (
          <button
            key={t.room.id}
            onClick={() => onConfirm({ targetRoom: t.room.id, tokenType: t.type })}
            className="block w-full rounded border border-dungeon-700 px-3 py-1.5 text-left text-sm hover:border-gold-500 hover:bg-dungeon-800"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={onCancel} className="rounded border border-dungeon-700 px-4 py-2 text-sm hover:bg-dungeon-800">
          Cancel
        </button>
      </div>
    </div>
  );
}

function TunnelMonsterChoice({
  request,
  onConfirm,
  onCancel,
}: {
  request: { toRoomLabel: string; damage: number; swordsAvailable: number };
  onConfirm: (choices: Record<string, any> | undefined) => void;
  onCancel: () => void;
}) {
  return (
    <div>
      <h3 className="mb-3 font-display text-lg font-bold text-blood-400">A Monster Blocks the Way!</h3>
      <p className="mb-4 text-sm text-parchment-300">
        There is a monster in the tunnel to {request.toRoomLabel}. Fight past it with {request.damage} Sword
        {request.damage === 1 ? "" : "s"}, or take {request.damage} damage and move through anyway.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <button onClick={onCancel} className="rounded border border-dungeon-700 px-4 py-2 text-sm hover:bg-dungeon-800">
          Cancel
        </button>
        <button
          onClick={() => onConfirm({ paySwords: false })}
          className="rounded border border-blood-600 px-4 py-2 text-sm text-blood-400 hover:bg-blood-600/10"
        >
          Take {request.damage} Damage
        </button>
        <button
          onClick={() => onConfirm({ paySwords: true })}
          className="rounded bg-gold-600 px-4 py-2 text-sm font-semibold text-dungeon-950 hover:bg-gold-500"
        >
          Fight Past (⚔{request.damage})
        </button>
      </div>
    </div>
  );
}

function CatapultPicker({
  request,
  onConfirm,
  onCancel,
}: {
  request: { players: PlayerRow[] };
  onConfirm: (choices: Record<string, any> | undefined) => void;
  onCancel: () => void;
}) {
  return (
    <div>
      <h3 className="mb-3 font-display text-lg font-bold text-gold-400">Catapult</h3>
      <p className="mb-3 text-sm text-parchment-300">Send a player's pawn back to the Entrance.</p>
      <div className="mb-4 space-y-1.5">
        {request.players
          .filter((p) => !p.has_escaped && !p.is_knocked_out)
          .map((p) => (
            <button
              key={p.id}
              onClick={() => onConfirm({ targetPlayerId: p.id })}
              className="block w-full rounded border border-dungeon-700 px-3 py-1.5 text-left text-sm hover:border-gold-500 hover:bg-dungeon-800"
            >
              {p.display_name}
            </button>
          ))}
      </div>
      <div className="flex justify-end">
        <button onClick={onCancel} className="rounded border border-dungeon-700 px-4 py-2 text-sm hover:bg-dungeon-800">
          Cancel
        </button>
      </div>
    </div>
  );
}
