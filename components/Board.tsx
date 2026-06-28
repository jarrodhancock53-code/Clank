"use client";

import { ADJACENCY, GRASS_LINE_Y, PLAYER_COLOR_HEX, ROOMS, RoomDef, TunnelDef } from "@/lib/game/board";
import { PlayerRow, RoomTokenState } from "@/lib/game/types";

const VIEW_W = 1000;
const VIEW_H = 850;

function roomRadius(room: RoomDef): number {
  if (room.type === "entrance") return 30;
  if (room.type === "artifact") return 26;
  return 22;
}

function roomFill(room: RoomDef, hasToken: boolean): string {
  switch (room.type) {
    case "entrance":
      return "#dcb24a";
    case "market":
      return "#3f8f4f";
    case "crystal_cave":
      return "#7fd4e8";
    case "depths":
      return "#1a150e";
    case "monkey_shrine":
      return "#b88a3a";
    case "artifact":
      return hasToken ? "#f0d785" : "#33281a";
    case "secret":
      return hasToken ? "#8b5cb8" : "#33281a";
    case "minor_secret":
      return hasToken ? "#5aa9d6" : "#33281a";
    default:
      return "#473420";
  }
}

function tunnelColor(t: TunnelDef): string {
  if (t.requires_key) return "#5aa9d6";
  if (t.monster_damage >= 2) return "#c2362c";
  if (t.monster_damage === 1) return "#d6792a";
  return "#6b5a3f";
}

export interface BoardProps {
  rooms: Record<string, RoomTokenState>;
  players: PlayerRow[];
  myPlayerId: string;
  movablePlayerId: string | null; // player whose adjacency should be highlighted as clickable (usually "my" id when it's my turn)
  onRoomClick?: (roomId: string) => void;
}

export function Board({ rooms, players, myPlayerId, movablePlayerId, onRoomClick }: BoardProps) {
  const activePlayer = players.find((p) => p.id === movablePlayerId);
  const adjacentRoomIds = new Set<string>(
    activePlayer ? (ADJACENCY[activePlayer.position] || []).map((t) => t.to) : []
  );

  const seenTunnels = new Set<string>();
  const tunnelLines: JSX.Element[] = [];
  for (const [roomId, tunnels] of Object.entries(ADJACENCY)) {
    for (const t of tunnels) {
      const key = [t.from, t.to].sort().join("::");
      if (seenTunnels.has(key)) continue;
      seenTunnels.add(key);
      const from = ROOMS.find((r) => r.id === t.from);
      const to = ROOMS.find((r) => r.id === t.to);
      if (!from || !to) continue;
      tunnelLines.push(
        <line
          key={key}
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={tunnelColor(t)}
          strokeWidth={t.cost_boots === 2 ? 5 : 3}
          strokeDasharray={t.requires_key ? "6 4" : undefined}
          opacity={0.85}
        />
      );
    }
  }

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full select-none" role="img" aria-label="Clank! dungeon board">
      <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#0a0805" />

      <line x1={20} y1={GRASS_LINE_Y} x2={VIEW_W - 20} y2={GRASS_LINE_Y} stroke="#3f8f4f" strokeWidth={2} strokeDasharray="10 6" opacity={0.6} />
      <text x={30} y={GRASS_LINE_Y - 8} fill="#3f8f4f" fontSize={12} fontFamily="Cinzel, serif" opacity={0.8}>
        GRASS LINE
      </text>

      <g>{tunnelLines}</g>

      {ROOMS.map((room) => {
        const tokenState = rooms[room.id];
        const hasToken =
          (room.type === "artifact" && tokenState?.artifactValue !== undefined) ||
          (room.type === "secret" && !!tokenState?.majorSecret) ||
          (room.type === "minor_secret" && !!tokenState?.minorSecret);
        const clickable = !!onRoomClick && adjacentRoomIds.has(room.id);
        const occupants = players.filter((p) => p.position === room.id && !p.is_knocked_out && !p.has_escaped);

        return (
          <g
            key={room.id}
            onClick={clickable ? () => onRoomClick!(room.id) : undefined}
            className={clickable ? "cursor-pointer" : ""}
          >
            <circle
              cx={room.x}
              cy={room.y}
              r={roomRadius(room)}
              fill={roomFill(room, hasToken)}
              stroke={clickable ? "#f0d785" : room.type === "crystal_cave" ? "#3a85b3" : "#7d5c17"}
              strokeWidth={clickable ? 3 : room.type === "crystal_cave" ? 2 : 1.5}
              strokeDasharray={room.type === "crystal_cave" ? "4 3" : undefined}
              className={clickable ? "animate-pulse-glow" : ""}
            />
            {room.type === "artifact" && (
              <text x={room.x} y={room.y + 4} textAnchor="middle" fontSize={11} fontFamily="Cinzel, serif" fill="#13100a" fontWeight={700}>
                {hasToken ? tokenState?.artifactValue : ""}
              </text>
            )}
            {room.type === "monkey_shrine" && (
              <text x={room.x} y={room.y + 4} textAnchor="middle" fontSize={11} fontFamily="Cinzel, serif" fill="#13100a" fontWeight={700}>
                🐒{tokenState?.monkeyIdols ?? 0}
              </text>
            )}
            <text
              x={room.x}
              y={room.y + roomRadius(room) + 13}
              textAnchor="middle"
              fontSize={9.5}
              fill="#dcc890"
              fontFamily="Inter, sans-serif"
            >
              {room.label}
            </text>

            {occupants.map((p, i) => {
              const angle = (i / Math.max(occupants.length, 1)) * Math.PI * 2;
              const offsetR = occupants.length > 1 ? 13 : 0;
              const px = room.x + Math.cos(angle) * offsetR;
              const py = room.y + Math.sin(angle) * offsetR - roomRadius(room) - 8;
              return (
                <g key={p.id}>
                  <circle
                    cx={px}
                    cy={py}
                    r={7}
                    fill={PLAYER_COLOR_HEX[p.color] || "#ecdcb3"}
                    stroke={p.id === myPlayerId ? "#f0d785" : "#0a0805"}
                    strokeWidth={p.id === myPlayerId ? 2.5 : 1.5}
                  />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
