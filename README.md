# Clank! Online

An async multiplayer web implementation of **Clank! A Deck-Building Adventure**, built with Next.js 14 (App Router) and Supabase (Postgres + Realtime). No accounts or passwords — players join a game with a 6-character code and a display name, and their identity is remembered in the browser.

## Stack

- **Next.js 14** (App Router, route handlers under `app/api/game/*`)
- **Supabase** — Postgres for all game state, Realtime for live sync (no Supabase Auth)
- **Tailwind CSS** — dark dungeon-fantasy theme, no component library
- **react-hot-toast** — error/notification toasts

## How identity works

There is no login. The first time a browser visits the site, `lib/identity.ts` generates a random UUID and stores it in `localStorage` (`clank_player_id`). That UUID is used directly as the primary key of the player's row in the `players` table. As long as the same browser/device is used, refreshing or closing the tab is safe — rejoining a game with the same join code recognizes the existing player.

There is intentionally no per-player secret or session token beyond this client-generated id.

## Local setup

### 1. Create a Supabase project

Create a free project at [supabase.com](https://supabase.com). You'll need:

- **Project URL** (`Settings → API → Project URL`)
- **Anon public key** (`Settings → API → Project API keys → anon public`)

### 2. Run the migration

Open the Supabase SQL editor and run the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). This creates the `games`, `players`, `turn_log`, `dungeon_row`, and `dragon_bag` tables, enables Row Level Security with fully-open policies (see *Known limitations* below), and adds all five tables to the `supabase_realtime` publication so the app can subscribe to live changes.

If you have the Supabase CLI linked to your project, you can instead run:

```bash
supabase db push
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both variables are prefixed `NEXT_PUBLIC_` because the same anon key is used by the browser (for Realtime subscriptions) and by the server-side API routes (there is no service-role key in this app — every write goes through the API routes, which apply all game-rule validation before touching the database).

### 4. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## Deploying to Vercel

1. Push this repository to GitHub (or your Git provider of choice).
2. Import the repo into [Vercel](https://vercel.com/new).
3. Add the two environment variables from step 3 above in the Vercel project settings (Production, Preview, and Development).
4. Deploy. No build configuration changes are needed — `next build` / `next start` work out of the box.

Because all game state lives in Supabase rather than server memory, the app works correctly on Vercel's serverless/edge model with zero special configuration — any instance can serve any request.

## Playing a game

1. One player clicks **Create Game**, enters a display name, and gets a 6-character join code (and a shareable link).
2. Other players (2–6 total) open the link or enter the code on the home page and enter their own display name.
3. Once at least 2 players have joined, the host clicks **Start Game**.
4. Each turn: **move** (click an adjacent room on the board), **play cards** from your hand to build a resource pool (Skill/Swords/Boots) and gold, then spend Skill to buy companions/items/devices from the Dungeon Row or the Reserve, spend Swords to fight monsters, and spend Boots to move. End your turn once you've moved at least once.
5. Escape through the Entrance with an artifact to start the Countdown Track — every other player then has a limited number of turns to escape too before the dragon wakes and knocks out everyone still in the dungeon.
6. When the game ends, a final scoreboard tallies artifacts, gold, card points, secret tokens, market items, and the Mastery Token bonus for whoever triggered the countdown and still escaped.

If a player goes quiet mid-game, anyone at the table can click **"Skip current player's turn (inactive)"** in the action panel to force their turn to end so the game isn't stuck waiting on them.

## Project structure

```
app/
  page.tsx                 home page (create/join)
  game/[code]/page.tsx      the lobby/board/scoreboard screen, keyed by join code
  api/game/*/route.ts       one route per game action (create, join, start, play-card,
                             move, buy-card, fight-monster, use-device, buy-market-item,
                             end-turn, skip-turn, dragon-attack, react-play, react-decline)
lib/
  game/board.ts             room + tunnel graph for the classic Clank! board
  game/cards.ts             every card definition (starting deck, reserve, dungeon deck)
  game/engine.ts            pure game-state-transition functions (no I/O)
  game/effects.ts           resolves each card/device's special effect text
  game/dragonBag.ts         dragon cube bag mechanics
  game/scoring.ts           end-of-game scoring
  game/db.ts                bridges the pure engine to Supabase rows
  api/client.ts             typed fetch wrappers the frontend calls
  identity.ts                localStorage player-id/name helpers
hooks/useGameRealtime.ts     subscribes to Supabase Realtime and triggers a refetch
components/                  Board (SVG), Card, PlayerSidebar, ActionPanel, ChoiceModal,
                             ReactPrompt, Lobby, FinalScoreboard, TurnLog, NameEntryForm
supabase/migrations/         SQL schema + RLS policies + Realtime publication setup
```

## Known limitations

**Hand contents and dungeon-deck order are visible to anyone with the join code.** This app has no account system by design — players are identified only by a client-generated id, and Row Level Security policies are fully open (`using (true)`) so that any participant's browser can read and write game rows without a server-side session. Supabase Realtime broadcasts raw row payloads (including the full `game_state` JSON, which contains every player's hand and the dungeon deck order) directly to every subscribed client, bypassing any redaction the Next.js API layer might otherwise apply.

In a board game where hidden hands and unseen deck order are part of the design, this means a technically-curious opponent could inspect network traffic to see information they shouldn't. Properly hiding this would require a real per-player auth/session system and server-authoritative payload filtering — both of which conflict with the "no traditional auth" requirement this app was built around. It's called out here rather than silently ignored: trust your fellow players, or treat this as a "perfect information for the curious" variant.

## Local development scripts

```bash
npm run dev      # start the dev server
npm run build    # production build
npm run start    # run the production build
npm run lint     # next lint
```
