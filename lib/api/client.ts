// Thin client-side fetch wrappers around the /api/game/* routes. Every
// call throws a plain Error with the server's message on failure so
// callers can catch it and show a toast.

async function post<T = any>(path: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(`/api/game/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request to ${path} failed (${res.status}).`);
  }
  return data as T;
}

export async function fetchGameByCode(code: string) {
  const res = await fetch(`/api/game/${encodeURIComponent(code)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load game.");
  return data;
}

export const api = {
  createGame: (displayName: string, playerId: string) => post("create", { displayName, playerId }),
  joinGame: (joinCode: string, displayName: string, playerId: string) => post("join", { joinCode, displayName, playerId }),
  startGame: (gameId: string, playerId: string) => post("start", { gameId, playerId }),
  playCard: (gameId: string, playerId: string, cardInstanceId: string, choices?: Record<string, any>) =>
    post("play-card", { gameId, playerId, cardInstanceId, choices }),
  move: (gameId: string, playerId: string, toRoomId: string, opts?: { paySwordsForMonster?: boolean; useTeleportCharge?: boolean }) =>
    post("move", { gameId, playerId, toRoomId, ...opts }),
  buyCardFromRow: (gameId: string, playerId: string, slot: number) => post("buy-card", { gameId, playerId, source: "row", slot }),
  buyCardFromReserve: (gameId: string, playerId: string, cardId: string) => post("buy-card", { gameId, playerId, source: "reserve", cardId }),
  fightMonsterInRow: (gameId: string, playerId: string, slot: number) => post("fight-monster", { gameId, playerId, source: "row", slot }),
  fightReserveGoblin: (gameId: string, playerId: string) => post("fight-monster", { gameId, playerId, source: "reserve" }),
  useDevice: (gameId: string, playerId: string, slot: number, choices?: Record<string, any>) =>
    post("use-device", { gameId, playerId, slot, choices }),
  buyMarketItem: (gameId: string, playerId: string, item: "crown" | "backpack" | "master_key") =>
    post("buy-market-item", { gameId, playerId, item }),
  endTurn: (gameId: string, playerId: string) => post("end-turn", { gameId, playerId }),
  skipTurn: (gameId: string, playerId: string) => post("skip-turn", { gameId, playerId }),
  manualDragonAttack: (gameId: string, playerId: string) => post("dragon-attack", { gameId, playerId }),
  reactPlay: (gameId: string, playerId: string, opportunityId: string, cardInstanceId: string) =>
    post("react-play", { gameId, playerId, opportunityId, cardInstanceId }),
  reactDecline: (gameId: string, playerId: string, opportunityId: string) =>
    post("react-decline", { gameId, playerId, opportunityId }),
};
