"use client";

import { Banner, getCardDef } from "@/lib/game/cards";

const BANNER_CLASSES: Record<Banner, string> = {
  gray: "bg-dungeon-600 border-dungeon-700",
  yellow: "bg-gold-600 border-gold-700",
  blue: "bg-clankblue-500 border-clankblue-400",
  red: "bg-blood-500 border-blood-600",
  purple: "bg-purple-600 border-purple-800",
};

function resourceIcons(r: { skill?: number; swords?: number; boots?: number; gold?: number; clank?: number }): string {
  const parts: string[] = [];
  if (r.skill) parts.push(`⚙${r.skill}`);
  if (r.swords) parts.push(`⚔${r.swords}`);
  if (r.boots) parts.push(`👣${r.boots}`);
  if (r.gold) parts.push(`💰${r.gold}`);
  if (r.clank) parts.push(`${r.clank > 0 ? "+" : ""}${r.clank} 🔔`);
  return parts.join("  ");
}

export interface CardProps {
  instanceId: string;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function Card({ instanceId, onClick, selected, disabled, size = "md" }: CardProps) {
  const def = getCardDef(instanceId);
  const dims = size === "sm" ? "w-20 h-28 text-[10px]" : "w-28 h-40 text-xs";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      title={def.description}
      className={[
        "group relative flex flex-col justify-between rounded-md border-2 p-1.5 text-left transition-transform",
        dims,
        BANNER_CLASSES[def.banner],
        onClick && !disabled ? "hover:-translate-y-1 hover:shadow-glow cursor-pointer" : "cursor-default",
        selected ? "ring-2 ring-gold-300 -translate-y-1" : "",
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-display font-semibold leading-tight text-parchment-100">{def.name}</span>
        {def.skill_cost !== undefined && (
          <span className="shrink-0 rounded-full bg-dungeon-950/70 px-1 text-gold-300">⚙{def.skill_cost}</span>
        )}
        {def.sword_cost !== undefined && (
          <span className="shrink-0 rounded-full bg-dungeon-950/70 px-1 text-blood-400">⚔{def.sword_cost}</span>
        )}
      </div>

      <div className="text-parchment-100/90">{resourceIcons(def.resources)}</div>

      <div className="flex items-end justify-between">
        <span className="line-clamp-2 text-[9px] text-parchment-200/80">{def.type !== "starting" ? def.description : ""}</span>
        {def.points > 0 && (
          <span className="ml-1 shrink-0 rounded-full bg-dungeon-950/70 px-1 font-display text-gold-300">{def.points}pt</span>
        )}
      </div>

      {def.isDanger && (
        <span className="absolute -top-2 -right-2 rounded-full bg-blood-600 px-1.5 py-0.5 text-[9px] font-bold text-parchment-100 shadow">
          DANGER
        </span>
      )}
    </button>
  );
}
