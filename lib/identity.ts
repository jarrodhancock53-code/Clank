"use client";

import { v4 as uuidv4 } from "uuid";

const PLAYER_ID_KEY = "clank_player_id";
const PLAYER_NAME_KEY = "clank_player_name";

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
