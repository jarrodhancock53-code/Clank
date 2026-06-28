// Static definition of the Clank! dungeon board: rooms, their layout
// coordinates for the SVG renderer, and the tunnel graph connecting them.

export type RoomType =
  | "entrance"
  | "normal"
  | "market"
  | "crystal_cave"
  | "depths"
  | "monkey_shrine"
  | "artifact"
  | "secret"
  | "minor_secret";

export interface RoomDef {
  id: string;
  label: string;
  type: RoomType;
  x: number;
  y: number;
  belowGrassLine: boolean;
  artifactValue?: number;
}

export interface TunnelDef {
  from: string;
  to: string;
  cost_boots: 1 | 2;
  monster_damage: 0 | 1 | 2;
  requires_key: boolean;
  one_way: boolean;
}

const BELOW_GRASS_LINE = new Set([
  "dungeon_depths",
  "monkey_shrine",
  "artifact_room_20",
  "artifact_room_25",
  "artifact_room_30",
  "minor_secret_room_5",
  "secret_room_5",
]);

export const GRASS_LINE_Y = 620;

export const ROOMS: RoomDef[] = [
  { id: "entrance", label: "Entrance", type: "entrance", x: 500, y: 60 },

  { id: "great_hall", label: "Great Hall", type: "normal", x: 300, y: 170 },
  { id: "armory", label: "Armory", type: "normal", x: 700, y: 170 },

  { id: "crypt", label: "Crypt", type: "normal", x: 80, y: 280 },
  { id: "market", label: "Market", type: "market", x: 248, y: 280 },
  { id: "artifact_room_5", label: "Artifact Room", type: "artifact", x: 416, y: 280, artifactValue: 5 },
  { id: "artifact_room_10", label: "Artifact Room", type: "artifact", x: 584, y: 280, artifactValue: 10 },
  { id: "crystal_cave_1", label: "Crystal Cave", type: "crystal_cave", x: 752, y: 280 },
  { id: "secret_room_1", label: "Secret Room", type: "secret", x: 920, y: 280 },

  { id: "monastery", label: "Monastery", type: "normal", x: 50, y: 390 },
  { id: "secret_room_2", label: "Secret Room", type: "secret", x: 140, y: 390 },
  { id: "artifact_room_15", label: "Artifact Room", type: "artifact", x: 230, y: 390, artifactValue: 15 },
  { id: "throne_room", label: "Throne Room", type: "normal", x: 320, y: 390 },
  { id: "minor_secret_room_1", label: "Minor Secret", type: "minor_secret", x: 410, y: 390 },
  { id: "minor_secret_room_6", label: "Minor Secret", type: "minor_secret", x: 500, y: 390 },
  { id: "secret_room_9", label: "Secret Room", type: "secret", x: 590, y: 390 },
  { id: "secret_room_6", label: "Secret Room", type: "secret", x: 680, y: 390 },
  { id: "crystal_cave_2", label: "Crystal Cave", type: "crystal_cave", x: 770, y: 390 },
  { id: "minor_secret_room_2", label: "Minor Secret", type: "minor_secret", x: 860, y: 390 },
  { id: "minor_secret_room_8", label: "Minor Secret", type: "minor_secret", x: 950, y: 390 },

  { id: "treasury", label: "Treasury", type: "normal", x: 60, y: 500 },
  { id: "minor_secret_room_3", label: "Minor Secret", type: "minor_secret", x: 170, y: 500 },
  { id: "secret_room_7", label: "Secret Room", type: "secret", x: 280, y: 500 },
  { id: "secret_room_4", label: "Secret Room", type: "secret", x: 390, y: 500 },
  { id: "minor_secret_room_9", label: "Minor Secret", type: "minor_secret", x: 500, y: 500 },
  { id: "secret_room_3", label: "Secret Room", type: "secret", x: 610, y: 500 },
  { id: "secret_room_8", label: "Secret Room", type: "secret", x: 720, y: 500 },
  { id: "minor_secret_room_7", label: "Minor Secret", type: "minor_secret", x: 830, y: 500 },
  { id: "minor_secret_room_4", label: "Minor Secret", type: "minor_secret", x: 940, y: 500 },

  { id: "dungeon_depths", label: "Dungeon Depths", type: "depths", x: 300, y: 660 },
  { id: "monkey_shrine", label: "Monkey Shrine", type: "monkey_shrine", x: 500, y: 660 },
  { id: "minor_secret_room_5", label: "Minor Secret", type: "minor_secret", x: 700, y: 660 },

  { id: "artifact_room_20", label: "Artifact Room", type: "artifact", x: 150, y: 770, artifactValue: 20 },
  { id: "artifact_room_25", label: "Artifact Room", type: "artifact", x: 383, y: 770, artifactValue: 25 },
  { id: "artifact_room_30", label: "Artifact Room", type: "artifact", x: 617, y: 770, artifactValue: 30 },
  { id: "secret_room_5", label: "Secret Room", type: "secret", x: 850, y: 770 },
].map((r) => ({ ...r, belowGrassLine: BELOW_GRASS_LINE.has(r.id) })) as RoomDef[];

export const ROOM_BY_ID: Record<string, RoomDef> = ROOMS.reduce((acc, r) => {
  acc[r.id] = r;
  return acc;
}, {} as Record<string, RoomDef>);

const RAW_TUNNELS: Array<[string, string, 1 | 2, 0 | 1 | 2, boolean?]> = [
  ["entrance", "great_hall", 1, 0],
  ["entrance", "armory", 1, 0],
  ["great_hall", "crypt", 1, 0],
  ["great_hall", "market", 1, 0],
  ["armory", "crystal_cave_1", 1, 0],
  ["armory", "secret_room_1", 2, 0],
  ["crypt", "monastery", 1, 0],
  ["crypt", "secret_room_2", 1, 1],
  ["market", "throne_room", 1, 0],
  ["market", "minor_secret_room_1", 1, 0],
  ["crystal_cave_1", "crystal_cave_2", 1, 0],
  ["crystal_cave_1", "minor_secret_room_2", 1, 0],
  ["crystal_cave_2", "dungeon_depths", 1, 1],
  ["crystal_cave_2", "secret_room_3", 1, 0],
  ["monastery", "treasury", 1, 0],
  ["monastery", "minor_secret_room_3", 1, 0],
  ["throne_room", "dungeon_depths", 2, 0],
  ["throne_room", "secret_room_4", 1, 0],
  ["treasury", "monkey_shrine", 1, 0, true],
  ["treasury", "minor_secret_room_4", 1, 0],
  ["dungeon_depths", "artifact_room_20", 1, 2],
  ["dungeon_depths", "artifact_room_25", 2, 1],
  ["dungeon_depths", "minor_secret_room_5", 1, 0],
  ["monkey_shrine", "artifact_room_30", 1, 1],
  ["monkey_shrine", "secret_room_5", 1, 0],
  ["artifact_room_5", "great_hall", 1, 0],
  ["artifact_room_5", "minor_secret_room_6", 1, 0],
  ["artifact_room_10", "armory", 1, 0],
  ["artifact_room_10", "secret_room_6", 1, 0],
  ["artifact_room_15", "crypt", 1, 1],
  ["artifact_room_15", "minor_secret_room_7", 1, 0],
  ["secret_room_1", "minor_secret_room_8", 1, 0],
  ["secret_room_2", "secret_room_7", 1, 0],
  ["secret_room_3", "minor_secret_room_9", 1, 0],
  ["secret_room_4", "secret_room_8", 1, 0],
  ["secret_room_6", "secret_room_9", 1, 0],
  ["secret_room_7", "artifact_room_15", 1, 0],
  ["secret_room_8", "artifact_room_10", 1, 0],
  ["secret_room_9", "artifact_room_5", 1, 0],
  ["minor_secret_room_8", "crystal_cave_1", 1, 0],
  ["minor_secret_room_9", "throne_room", 1, 0],
];

export const TUNNELS: TunnelDef[] = RAW_TUNNELS.map(([from, to, cost_boots, monster_damage, requires_key]) => ({
  from,
  to,
  cost_boots,
  monster_damage,
  requires_key: !!requires_key,
  one_way: false,
}));

// Build adjacency map. Tunnels are bidirectional unless one_way is set.
export function buildAdjacency(): Record<string, TunnelDef[]> {
  const adj: Record<string, TunnelDef[]> = {};
  for (const room of ROOMS) adj[room.id] = [];
  for (const t of TUNNELS) {
    adj[t.from].push(t);
    if (!t.one_way) {
      adj[t.to].push({ ...t, from: t.to, to: t.from });
    }
  }
  return adj;
}

export const ADJACENCY = buildAdjacency();

export function getTunnel(from: string, to: string): TunnelDef | undefined {
  return ADJACENCY[from]?.find((t) => t.to === to);
}

export function isAdjacent(from: string, to: string): boolean {
  return !!getTunnel(from, to);
}

export const ARTIFACT_ROOMS = ROOMS.filter((r) => r.type === "artifact");
export const MAJOR_SECRET_ROOMS = ROOMS.filter((r) => r.type === "secret");
export const MINOR_SECRET_ROOMS = ROOMS.filter((r) => r.type === "minor_secret");

export const PLAYER_COLORS = ["red", "blue", "green", "yellow", "purple", "orange"] as const;
export type PlayerColor = typeof PLAYER_COLORS[number];

export const PLAYER_COLOR_HEX: Record<string, string> = {
  red: "#c2362c",
  blue: "#3a85b3",
  green: "#3f8f4f",
  yellow: "#d6b32a",
  purple: "#8b5cb8",
  orange: "#d6792a",
};
