"use client";

import { PLAYER_COLOR_HEX } from "@/lib/game/board";
import { GameRow, MAX_HEALTH, PlayerRow, TurnLogRow } from "@/lib/game/types";
import { TurnLog } from "./TurnLog";

const RAGE_TRACK = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const COUNTDOWN_TRACK = [0, 1, 2, 3, 4, 5];

function tokenSummary(player: PlayerRow): string {
  const tags: string[] = [];
  const majorSecrets = player.tokens.filter((t) => t.startsWith("major_secret")).length;
  const minorSecrets = player.tokens.filter((t) => t.startsWith("minor_secret")).length;
  const idols = player.tokens.filter((t) => t === "monkey_idol").length;
  if (majorSecrets) tags.push(`${majorSecrets}✨`);
  if (minorSecrets) tags.push(`${minorSecrets}🔹`);
  if (idols) tags.push(`${idols}🐒`);
  if (player.tokens.includes("crown")) tags.push("👑");
  if (player.tokens.includes("backpack")) tags.push("🎒");
  if (player.tokens.includes("master_key")) tags.push("🔑");
  return tags.join(" ");
}

export interface PlayerSidebarProps {
  game: GameRow;
  players: PlayerRow[];
  turnLog: TurnLogRow[];
  myPlayerId: string;
  dragonBagCount: number;
}

export function PlayerSidebar({ game, players, turnLog, myPlayerId, dragonBagCount }: PlayerSidebarProps) {
  const currentPlayerId = game.player_order[game.current_player_index];

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3 text-parchment-200">
      <div>
        <h2 className="mb-1 font-display text-lg font-bold text-gold-400">Adventurers</h2>
        <div className="space-y-1.5">
          {players.map((p) => {
            const clank = game.game_state.clankArea[p.id] || 0;
            const isTurn = p.id === currentPlayerId;
            const isMe = p.id === myPlayerId;
            const artifactPts = p.artifacts.reduce((s, a) => s + a.value, 0);
            return (
              <div
                key={p.id}
                className={[
                  "rounded border px-2 py-1.5",
                  isTurn ? "border-gold-400 bg-gold-700/10 glow-border" : "border-dungeon-700 bg-dungeon-900/50",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-dungeon-950"
                    style={{ backgroundColor: PLAYER_COLOR_HEX[p.color] }}
                  />
                  <span className="truncate text-sm font-semibold">
                    {p.display_name}
                    {isMe ? " (you)" : ""}
                  </span>
                  {isTurn && <span className="ml-auto shrink-0 text-[10px] font-bold text-gold-300">TURN</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-parchment-300/90">
                  <span title="Health">
                    ❤ {p.health}/{MAX_HEALTH}
                  </span>
                  <span title="Gold">💰 {p.gold}</span>
                  <span title="Clank in area">🔔 {clank}</span>
                  {artifactPts > 0 && <span title="Artifact points">🏺 {artifactPts}</span>}
                  {tokenSummary(p) && <span>{tokenSummary(p)}</span>}
                  {p.has_escaped && <span className="text-clankblue-400">ESCAPED</span>}
                  {p.is_knocked_out && <span className="text-blood-400">KNOCKED OUT</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-1 font-display text-sm font-semibold text-gold-400">Dragon Rage</h3>
        <div className="flex gap-1">
          {RAGE_TRACK.map((n) => (
            <div
              key={n}
              className={[
                "flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold",
                n <= game.dragon_rage ? "bg-blood-500 text-parchment-100" : "bg-dungeon-700 text-parchment-300/60",
              ].join(" ")}
            >
              {n}
            </div>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-parchment-300/70">🐲 {dragonBagCount} cubes remain in the bag.</p>
      </div>

      {game.countdown_track !== null && game.countdown_track !== undefined && (
        <div>
          <h3 className="mb-1 font-display text-sm font-semibold text-gold-400">Countdown</h3>
          <div className="flex gap-1">
            {COUNTDOWN_TRACK.map((n) => (
              <div
                key={n}
                className={[
                  "flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold",
                  n <= (game.countdown_track || 0) ? "bg-gold-500 text-dungeon-950" : "bg-dungeon-700 text-parchment-300/60",
                ].join(" ")}
              >
                {n}
              </div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-parchment-300/70">
            {players.find((p) => p.id === game.first_escape_player_id)?.display_name || "Someone"} triggered the countdown by escaping!
          </p>
        </div>
      )}

      <div className="min-h-[160px] flex-1">
        <TurnLog entries={turnLog} />
      </div>
    </div>
  );
}
