"use client";

import { useState } from "react";

export function NameEntryForm({
  title,
  submitLabel,
  defaultName,
  busy,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  defaultName?: string;
  busy?: boolean;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(defaultName || "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed) onSubmit(trimmed);
      }}
      className="parchment-panel glow-border w-full max-w-sm rounded-lg p-6"
    >
      <h2 className="mb-4 font-display text-xl font-bold text-gold-400">{title}</h2>
      <label className="mb-1 block text-sm text-parchment-300">Your name</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={24}
        placeholder="Enter a display name"
        className="mb-4 w-full rounded border border-dungeon-700 bg-dungeon-950 px-3 py-2 text-parchment-100 outline-none focus:border-gold-500"
      />
      <button
        type="submit"
        disabled={!name.trim() || busy}
        className="w-full rounded bg-gold-600 px-4 py-2 font-display font-semibold text-dungeon-950 transition hover:bg-gold-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
