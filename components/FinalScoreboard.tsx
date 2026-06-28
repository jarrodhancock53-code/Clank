"use client";

import { GameRow, PlayerRow } from "@/lib/game/types";
import { scoreAllPlayers } from "@/lib/game/scoring";
import { PLAYER_COLOR_HEX } from "@/lib/game/board";

export function FinalScoreboard({ game, players, myPlayerId }: { game: GameRow; players: PlayerRow[]; myPlayerId: string }) {
  const breakdowns = scoreAllPlayers(players, game.game_state, game.first_escape_player_id);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="font-display text-4xl font-black text-gold-400">The Dungeon Run Has Ended</h1>

      <div className="w-full max-w-2xl overflow-x-auto rounded-lg border border-dungeon-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-dungeon-900 text-left text-parchment-300">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2 text-right">Artifacts</th>
              <th className="px-3 py-2 text-right">Gold</th>
              <th className="px-3 py-2 text-right">Cards</th>
              <th className="px-3 py-2 text-right">Secrets</th>
              <th className="px-3 py-2 text-right">Market</th>
              <th className="px-3 py-2 text-right">Idols</th>
              <th className="px-3 py-2 text-right">Mastery</th>
              <th className="px-3 py-2 text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {breakdowns.map((b, i) => {
              const player = players.find((p) => p.id === b.playerId);
              return (
                <tr
                  key={b.playerId}
                  className={[
                    "border-t border-dungeon-700",
                    i === 0 ? "bg-gold-700/15" : "bg-dungeon-900/40",
                    b.playerId === myPlayerId ? "ring-1 ring-inset ring-gold-500/40" : "",
                  ].join(" ")}
                >
                  <td className="px-3 py-2 font-display text-gold-400">{i + 1}</td>
                  <td className="px-3 py-2">
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: player ? PLAYER_COLOR_HEX[player.color] : "#999" }}
                    />
                    {b.displayName}
                    {!b.qualified && <span className="ml-2 text-[10px] text-blood-400">(did not qualify)</span>}
                  </td>
                  <td className="px-3 py-2 text-right">{b.artifactPoints}</td>
                  <td className="px-3 py-2 text-right">{b.goldPoints}</td>
                  <td className="px-3 py-2 text-right">{b.cardPoints}</td>
                  <td className="px-3 py-2 text-right">{b.majorSecretPoints + b.minorSecretPoints}</td>
                  <td className="px-3 py-2 text-right">{b.marketPoints}</td>
                  <td className="px-3 py-2 text-right">{b.monkeyIdolPoints}</td>
                  <td className="px-3 py-2 text-right">{b.masteryPoints}</td>
                  <td className="px-3 py-2 text-right font-display text-lg font-bold text-gold-300">{b.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <a href="/" className="rounded bg-gold-600 px-6 py-2 font-display font-semibold text-dungeon-950 hover:bg-gold-500">
        Back to Home
      </a>
    </main>
  );
}
