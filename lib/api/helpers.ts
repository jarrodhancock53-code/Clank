import { NextResponse } from "next/server";
import { GameActionError } from "@/lib/game/types";

export function handleRouteError(e: unknown): NextResponse {
  if (e instanceof GameActionError) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  console.error(e);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}

export async function readJsonBody<T = any>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new GameActionError("Invalid request body.");
  }
}

export function requireField<T>(body: Record<string, any>, field: string): T {
  const value = body[field];
  if (value === undefined || value === null || value === "") {
    throw new GameActionError(`Missing required field: ${field}.`);
  }
  return value as T;
}
