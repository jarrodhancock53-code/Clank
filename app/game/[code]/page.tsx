"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api, fetchGameByCode } from "@/lib/api/client";
import {
  addLocalSeat,
  getActiveSeat,
  getLocalSeats,
  getOrCreatePlayerId,
  getStoredPlayerName,
  setActiveSeat,
  setStoredPlayerName,
} from "@/lib/identity";
import { useGameRealtime } from "@/hooks/useGameRealtime";
import { ROOM_BY_ID, getTunnel } from "@/lib/game/board";
import { getCardDef } from "@/lib/game/cards";
import { GameRow, PlayerRow, TurnLogRow } from "@/lib/game/types";
import { Lobby } from "@/components/Lobby";
import { Board } from "@/components/Board";
import { PlayerSidebar } from "@/components/PlayerSidebar";
import { ActionPanel } from "@/components/ActionPanel";
import { ChoiceModal, ChoiceRequest } from "@/components/ChoiceModal";
import { ReactPrompt } from "@/components/ReactPrompt";
import { PendingDiscardPrompt } from "@/components/PendingDiscardPrompt";
import { FinalScoreboard } from "@/components/FinalScoreboard";
import { NameEntryForm } from "@/components/NameEntryForm";
import { SeatSwitcher } from "@/components/SeatSwitcher";

interface GameSnapshot {
  game: GameRow;
  players: PlayerRow[];
  dungeonRow: (string | null)[];
  dragonBagCubes: string[];
  turnLog: TurnLogRow[];
}

export default function GamePage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  // The identity this device created for itself (used to join as a regular
  // player). `viewerId` below is whichever seat this device is currently
  // *acting as*, which may differ from `deviceId` when pass-and-play has
  // added extra local seats to the same device.
  const [deviceId, setDeviceId] = useState("");
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);
  const [seatSwitcherOpen, setSeatSwitcherOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<ChoiceRequest | null>(null);

  useEffect(() => {
    setDeviceId(getOrCreatePlayerId());
  }, []);

  const refetch = useCallback(async () => {
    try {
      const data = await fetchGameByCode(code);
      setSnapshot(data);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e.message || "Failed to load game.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useGameRealtime(snapshot?.game.id, refetch);

  // Seats this device controls (its own identity plus any local seats added
  // for pass-and-play) that are actually players in this game.
  const mySeats = useMemo(() => {
    if (!snapshot || !deviceId) return [];
    const ids = new Set([deviceId, ...getLocalSeats().map((s) => s.id)]);
    return snapshot.players.filter((p) => ids.has(p.id));
  }, [snapshot, deviceId]);

  useEffect(() => {
    if (!snapshot || mySeats.length === 0) return;
    const stored = getActiveSeat(snapshot.game.id);
    if (stored && mySeats.some((p) => p.id === stored)) {
      setActiveSeatId(stored);
    } else if (mySeats.length === 1) {
      setActiveSeat(snapshot.game.id, mySeats[0].id);
      setActiveSeatId(mySeats[0].id);
    } else {
      setActiveSeatId(null); // multiple seats, none chosen yet — prompt below
    }
  }, [snapshot?.game.id, mySeats]);

  const viewerId = activeSeatId || deviceId;

  function chooseSeat(playerId: string) {
    if (snapshot) setActiveSeat(snapshot.game.id, playerId);
    setActiveSeatId(playerId);
    setSeatSwitcherOpen(false);
  }

  async function handleJoin(name: string) {
    setJoining(true);
    try {
      setStoredPlayerName(name);
      await api.joinGame(code, name, deviceId);
      await refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to join game.");
    } finally {
      setJoining(false);
    }
  }

  async function handleAddLocalPlayer(name: string) {
    setBusy(true);
    try {
      const seat = addLocalSeat(name);
      setStoredPlayerName(name);
      await api.joinGame(code, name, seat.id);
      await refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to add player.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!snapshot) return;
    setBusy(true);
    try {
      await api.startGame(snapshot.game.id, viewerId);
      await refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to start game.");
    } finally {
      setBusy(false);
    }
  }

  async function run<T>(action: () => Promise<T>) {
    setBusy(true);
    try {
      await action();
      await refetch();
    } catch (e: any) {
      toast.error(e.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  function doPlayCard(cardInstanceId: string, choices?: Record<string, any>) {
    if (!snapshot) return;
    return run(() => api.playCard(snapshot.game.id, viewerId, cardInstanceId, choices));
  }

  function doMove(toRoomId: string, opts?: { paySwordsForMonster?: boolean; useTeleportCharge?: boolean }) {
    if (!snapshot) return;
    return run(() => api.move(snapshot.game.id, viewerId, toRoomId, opts));
  }

  function doUseDevice(slot: number, choices?: Record<string, any>) {
    if (!snapshot) return;
    return run(() => api.useDevice(snapshot.game.id, viewerId, slot, choices));
  }

  function handlePlayCard(cardInstanceId: string) {
    if (!snapshot) return;
    const def = getCardDef(cardInstanceId);
    const me = snapshot.players.find((p) => p.id === viewerId);
    if (!me) return;

    if (def.effects.includes("discard_1_to_draw_2")) {
      setPendingChoice({ kind: "discard_for_draw", cardInstanceId, hand: me.hand.filter((id) => id !== cardInstanceId) });
      return;
    }
    if (def.effects.includes("look_at_top_3_dungeon_cards_reorder")) {
      setPendingChoice({ kind: "reorder_top3", cardInstanceId, top3: snapshot.game.game_state.dungeonDeck.slice(0, 3) });
      return;
    }
    doPlayCard(cardInstanceId);
  }

  function handleRoomClick(roomId: string) {
    if (!snapshot) return;
    const me = snapshot.players.find((p) => p.id === viewerId);
    if (!me) return;
    const tunnel = getTunnel(me.position, roomId);
    if (!tunnel) return;

    const teleportCharges = snapshot.game.game_state.teleportCharges;
    if (teleportCharges > 0) {
      doMove(roomId, { useTeleportCharge: true });
      return;
    }

    if (tunnel.monster_damage > 0) {
      const pool = snapshot.game.game_state.turnPool;
      const canPaySwords = pool.swords >= tunnel.monster_damage;
      const canTakeDamage = me.health - tunnel.monster_damage > 0;
      if (canPaySwords && canTakeDamage) {
        setPendingChoice({
          kind: "tunnel_monster",
          toRoomId: roomId,
          toRoomLabel: ROOM_BY_ID[roomId]?.label || roomId,
          damage: tunnel.monster_damage,
          swordsAvailable: pool.swords,
        });
        return;
      }
      doMove(roomId, { paySwordsForMonster: canPaySwords && !canTakeDamage });
      return;
    }

    doMove(roomId);
  }

  function handleUseDevice(slot: number) {
    if (!snapshot) return;
    const cardId = snapshot.dungeonRow[slot];
    if (!cardId) return;
    const def = getCardDef(cardId);

    if (def.effects.includes("teleport_to_any_room_no_boots")) {
      setPendingChoice({ kind: "device_teleport", slot });
      return;
    }
    if (def.effects.includes("take_any_secret_token_in_any_room_without_moving")) {
      setPendingChoice({ kind: "device_burglar", slot, rooms: snapshot.game.game_state.rooms });
      return;
    }
    if (def.effects.includes("move_any_player_pawn_to_entrance")) {
      setPendingChoice({ kind: "device_catapult", slot, players: snapshot.players });
      return;
    }
    doUseDevice(slot);
  }

  function handleChoiceConfirm(choices: Record<string, any> | undefined) {
    if (!pendingChoice) return;
    const req = pendingChoice;
    setPendingChoice(null);
    if (req.kind === "discard_for_draw" || req.kind === "reorder_top3") {
      doPlayCard(req.cardInstanceId, choices);
    } else if (req.kind === "device_teleport" || req.kind === "device_burglar" || req.kind === "device_catapult") {
      doUseDevice(req.slot, choices);
    } else if (req.kind === "tunnel_monster") {
      doMove(req.toRoomId, { paySwordsForMonster: !!choices?.paySwords });
    }
  }

  function handleChoiceCancel() {
    setPendingChoice(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-parchment-300">
        <p>Loading the dungeon…</p>
      </main>
    );
  }

  if (loadError || !snapshot) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 text-parchment-300">
        <p className="text-blood-400">{loadError || "Game not found."}</p>
        <a href="/" className="rounded bg-gold-600 px-4 py-2 font-display font-semibold text-dungeon-950 hover:bg-gold-500">
          Back to Home
        </a>
      </main>
    );
  }

  const { game, players, dungeonRow, dragonBagCubes, turnLog } = snapshot;
  const me = players.find((p) => p.id === viewerId);

  if (!me) {
    if (game.status !== "lobby") {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 text-parchment-300">
          <p className="text-blood-400">This dungeon run has already begun — you can no longer join it.</p>
          <a href="/" className="rounded bg-gold-600 px-4 py-2 font-display font-semibold text-dungeon-950 hover:bg-gold-500">
            Back to Home
          </a>
        </main>
      );
    }
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-gold-400">Joining game {code}…</h1>
        <NameEntryForm
          title="Enter the Dungeon"
          submitLabel="Join Game"
          defaultName={getStoredPlayerName()}
          busy={joining}
          onSubmit={handleJoin}
        />
      </main>
    );
  }

  if (game.status === "lobby") {
    return (
      <Lobby
        game={game}
        players={players}
        myPlayerId={viewerId}
        busy={busy}
        onStart={handleStart}
        onAddLocalPlayer={handleAddLocalPlayer}
      />
    );
  }

  if (game.status === "finished") {
    return <FinalScoreboard game={game} players={players} myPlayerId={viewerId} />;
  }

  const isMyTurn = game.player_order[game.current_player_index] === viewerId;
  const isHost = game.host_player_id === viewerId;
  const myReactOpportunity = game.game_state.turnFlags.reactOpportunities.find((o) => o.playerId === viewerId);
  const myPendingDiscard = game.game_state.turnFlags.pendingDiscard?.playerId === viewerId;

  return (
    <main className="flex h-screen flex-col bg-dungeon-texture lg:flex-row">
      <div className="order-2 h-72 shrink-0 border-t border-dungeon-700 lg:order-1 lg:h-full lg:w-72 lg:border-r lg:border-t-0">
        <PlayerSidebar
          game={game}
          players={players}
          turnLog={turnLog}
          myPlayerId={viewerId}
          dragonBagCount={dragonBagCubes.length}
          onSwitchPlayer={mySeats.length > 1 ? () => setSeatSwitcherOpen(true) : undefined}
        />
      </div>

      <div className="order-1 flex-1 lg:order-2">
        <Board
          rooms={game.game_state.rooms}
          players={players}
          myPlayerId={viewerId}
          movablePlayerId={isMyTurn ? viewerId : null}
          onRoomClick={isMyTurn && !busy ? handleRoomClick : undefined}
        />
      </div>

      <div className="order-3 h-96 shrink-0 border-t border-dungeon-700 lg:h-full lg:w-80 lg:border-l lg:border-t-0">
        <ActionPanel
          game={game}
          me={me}
          dungeonRow={dungeonRow}
          isMyTurn={isMyTurn}
          isHost={isHost}
          busy={busy}
          onPlayCard={handlePlayCard}
          onBuyRow={(slot) => run(() => api.buyCardFromRow(game.id, viewerId, slot))}
          onBuyReserve={(cardId) => run(() => api.buyCardFromReserve(game.id, viewerId, cardId))}
          onFightRow={(slot) => run(() => api.fightMonsterInRow(game.id, viewerId, slot))}
          onFightReserveGoblin={() => run(() => api.fightReserveGoblin(game.id, viewerId))}
          onUseDevice={handleUseDevice}
          onBuyMarketItem={(item) => run(() => api.buyMarketItem(game.id, viewerId, item))}
          onEndTurn={() => run(() => api.endTurn(game.id, viewerId))}
          onSkipTurn={() => run(() => api.skipTurn(game.id, viewerId))}
          onManualDragonAttack={() => run(() => api.manualDragonAttack(game.id, viewerId))}
        />
      </div>

      {pendingChoice && <ChoiceModal request={pendingChoice} onConfirm={handleChoiceConfirm} onCancel={handleChoiceCancel} />}

      {myReactOpportunity && (
        <ReactPrompt
          opportunity={myReactOpportunity}
          hand={me.hand}
          busy={busy}
          onPlay={(cardInstanceId) =>
            run(() => api.reactPlay(game.id, viewerId, myReactOpportunity.id, cardInstanceId))
          }
          onDecline={() => run(() => api.reactDecline(game.id, viewerId, myReactOpportunity.id))}
        />
      )}

      {myPendingDiscard && (
        <PendingDiscardPrompt
          hand={me.hand}
          busy={busy}
          onDiscard={(cardInstanceId) => run(() => api.resolvePendingDiscard(game.id, viewerId, cardInstanceId))}
        />
      )}

      {(seatSwitcherOpen || (mySeats.length > 1 && !activeSeatId)) && (
        <SeatSwitcher
          seats={mySeats.map((p) => ({ id: p.id, name: p.display_name, color: p.color }))}
          onChoose={chooseSeat}
          onClose={activeSeatId ? () => setSeatSwitcherOpen(false) : undefined}
        />
      )}
    </main>
  );
}
