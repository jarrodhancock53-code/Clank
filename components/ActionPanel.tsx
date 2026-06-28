"use client";

import { RESERVE_CARDS, getCardDef } from "@/lib/game/cards";
import { GameRow, PlayerRow } from "@/lib/game/types";
import { Card } from "./Card";

export function ActionPanel({
  game,
  me,
  dungeonRow,
  isMyTurn,
  isHost,
  busy,
  onPlayCard,
  onBuyRow,
  onBuyReserve,
  onFightRow,
  onFightReserveGoblin,
  onUseDevice,
  onBuyMarketItem,
  onEndTurn,
  onSkipTurn,
  onManualDragonAttack,
}: {
  game: GameRow;
  me: PlayerRow;
  dungeonRow: (string | null)[];
  isMyTurn: boolean;
  isHost: boolean;
  busy: boolean;
  onPlayCard: (cardInstanceId: string) => void;
  onBuyRow: (slot: number) => void;
  onBuyReserve: (cardId: string) => void;
  onFightRow: (slot: number) => void;
  onFightReserveGoblin: () => void;
  onUseDevice: (slot: number) => void;
  onBuyMarketItem: (item: "crown" | "backpack" | "master_key") => void;
  onEndTurn: () => void;
  onSkipTurn: () => void;
  onManualDragonAttack: () => void;
}) {
  const pool = game.game_state.turnPool;
  const market = game.game_state.market;
  const disabled = !isMyTurn || busy;
  const canUseMarket = isMyTurn && me.position === "market" && me.gold >= 7;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3 text-parchment-200">
      <div>
        <h3 className="mb-1 font-display text-sm font-semibold text-gold-400">Your Pool</h3>
        <div className="flex gap-3 text-sm">
          <span title="Skill">⚙ {pool.skill}</span>
          <span title="Swords">⚔ {pool.swords}</span>
          <span title="Boots">👣 {pool.boots}</span>
          <span title="Gold">💰 {me.gold}</span>
        </div>
      </div>

      <div>
        <h3 className="mb-1 font-display text-sm font-semibold text-gold-400">Your Hand</h3>
        <div className="flex flex-wrap gap-2">
          {me.hand.map((id) => (
            <Card key={id} instanceId={id} size="sm" disabled={disabled} onClick={() => onPlayCard(id)} />
          ))}
          {me.hand.length === 0 && <p className="text-xs italic text-parchment-300/60">Empty hand.</p>}
        </div>
      </div>

      <div>
        <h3 className="mb-1 font-display text-sm font-semibold text-gold-400">Dungeon Row</h3>
        <div className="flex flex-wrap gap-2">
          {dungeonRow.map((cardId, slot) => {
            if (!cardId) {
              return (
                <div
                  key={slot}
                  className="flex h-28 w-20 items-center justify-center rounded border border-dashed border-dungeon-700 text-[10px] text-parchment-300/40"
                >
                  empty
                </div>
              );
            }
            const def = getCardDef(cardId);
            return (
              <div key={slot} className="flex flex-col items-center gap-1">
                <Card instanceId={cardId} size="sm" />
                {(def.type === "companion" || def.type === "item") && (
                  <button
                    onClick={() => onBuyRow(slot)}
                    disabled={disabled || pool.skill < (def.skill_cost || 0)}
                    className="w-full rounded bg-gold-600 px-1 py-0.5 text-[10px] font-semibold text-dungeon-950 hover:bg-gold-500 disabled:opacity-40"
                  >
                    Buy ⚙{def.skill_cost}
                  </button>
                )}
                {def.type === "monster" && (
                  <button
                    onClick={() => onFightRow(slot)}
                    disabled={disabled || pool.swords < (def.sword_cost || 0)}
                    className="w-full rounded bg-blood-600 px-1 py-0.5 text-[10px] font-semibold text-parchment-100 hover:bg-blood-500 disabled:opacity-40"
                  >
                    Fight ⚔{def.sword_cost}
                  </button>
                )}
                {def.type === "device" && (
                  <button
                    onClick={() => onUseDevice(slot)}
                    disabled={disabled || pool.skill < (def.skill_cost || 0)}
                    className="w-full rounded bg-clankblue-500 px-1 py-0.5 text-[10px] font-semibold text-dungeon-950 hover:bg-clankblue-400 disabled:opacity-40"
                  >
                    Use ⚙{def.skill_cost}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-1 font-display text-sm font-semibold text-gold-400">Reserve (always available)</h3>
        <div className="flex flex-wrap gap-2">
          {RESERVE_CARDS.map((def) => (
            <div key={def.id} className="flex flex-col items-center gap-1">
              <Card instanceId={`${def.id}__reserve`} size="sm" />
              {def.type === "monster" ? (
                <button
                  onClick={onFightReserveGoblin}
                  disabled={disabled || pool.swords < (def.sword_cost || 0)}
                  className="w-full rounded bg-blood-600 px-1 py-0.5 text-[10px] font-semibold text-parchment-100 hover:bg-blood-500 disabled:opacity-40"
                >
                  Fight ⚔{def.sword_cost}
                </button>
              ) : (
                <button
                  onClick={() => onBuyReserve(def.id)}
                  disabled={disabled || pool.skill < (def.skill_cost || 0)}
                  className="w-full rounded bg-gold-600 px-1 py-0.5 text-[10px] font-semibold text-dungeon-950 hover:bg-gold-500 disabled:opacity-40"
                >
                  Buy ⚙{def.skill_cost}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {me.position === "market" && (
        <div>
          <h3 className="mb-1 font-display text-sm font-semibold text-gold-400">Market (7 Gold each)</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => onBuyMarketItem("crown")}
              disabled={!canUseMarket || !market.crownAvailable}
              className="rounded border border-gold-600 px-2 py-1 hover:bg-gold-700/20 disabled:opacity-40"
            >
              👑 Crown ({market.crownValue}pt)
            </button>
            <button
              onClick={() => onBuyMarketItem("backpack")}
              disabled={!canUseMarket || !market.backpackAvailable}
              className="rounded border border-gold-600 px-2 py-1 hover:bg-gold-700/20 disabled:opacity-40"
            >
              🎒 Backpack (5pt)
            </button>
            <button
              onClick={() => onBuyMarketItem("master_key")}
              disabled={!canUseMarket || !market.masterKeyAvailable}
              className="rounded border border-gold-600 px-2 py-1 hover:bg-gold-700/20 disabled:opacity-40"
            >
              🔑 Master Key (5pt)
            </button>
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <button
          onClick={onEndTurn}
          disabled={disabled || !game.game_state.turnFlags.hasMovedThisTurn}
          className="rounded bg-gold-600 px-4 py-2 font-display font-bold text-dungeon-950 hover:bg-gold-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          End Turn
        </button>
        <button
          onClick={onSkipTurn}
          disabled={busy}
          className="rounded border border-dungeon-700 px-3 py-1.5 text-xs text-parchment-300/70 hover:bg-dungeon-800 disabled:opacity-40"
        >
          Skip current player's turn (inactive)
        </button>
        {isHost && (
          <button
            onClick={onManualDragonAttack}
            disabled={busy}
            className="rounded border border-blood-600 px-3 py-1.5 text-xs text-blood-400 hover:bg-blood-600/10 disabled:opacity-40"
          >
            ⚠ Manual Dragon Attack (host)
          </button>
        )}
      </div>
    </div>
  );
}
