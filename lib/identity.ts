"use client";

import { v4 as uuidv4 } from "uuid";

const PLAYER_ID_KEY = "clank_player_id";
const PLAYER_NAME_KEY = "clank_player_name";
const LOCAL_SEATS_KEY = "clank_local_seats";
const ACTIVE_SEAT_PREFIX = "clank_active_seat_";

export function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getStoredPlayerName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PLAYER_NAME_KEY) || "";
}

export function setStoredPlayerName(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAYER_NAME_KEY, name);
}

export interface LocalSeat {
  id: string;
  name: string;
}

// Extra player identities created on this same device, so one phone/laptop
// can add several seats to a lobby for pass-and-play without anyone else
// needing a separate browser or device.
export function getLocalSeats(): LocalSeat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_SEATS_KEY);
    return raw ? (JSON.parse(raw) as LocalSeat[]) : [];
  } catch {
    return [];
  }
}

export function addLocalSeat(name: string): LocalSeat {
  const seat: LocalSeat = { id: uuidv4(), name };
  const seats = getLocalSeats();
  seats.push(seat);
  localStorage.setItem(LOCAL_SEATS_KEY, JSON.stringify(seats));
  return seat;
}

// Which seat this device is currently viewing/acting as, per game — lets
// one device hold multiple seats and "pass the device" between them.
export function getActiveSeat(gameId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_SEAT_PREFIX + gameId);
}

export function setActiveSeat(gameId: string, playerId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_SEAT_PREFIX + gameId, playerId);
}
