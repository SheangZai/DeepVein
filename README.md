# Deepvein

A daily trivia dig for iOS and Android. You get 7 prompts with 25 seconds each. Any correct answer counts, and rarer answers dig deeper. Built with Expo (React Native).

## Features

| Feature | Where |
|---|---|
| Daily Dig: same 7 prompts for everyone, resets at midnight UTC+8 | `src/app/dig.tsx`, `src/game/schedule.ts` |
| Tiers: Dirt 10 · Fool's Gold 15 · Copper 30 · Emerald 60 · Ruby 85 · 💎 Diamond 100 | `src/game/tiers.ts` |
| Lenient matching: typos, aliases, plurals, never across numbers | `src/game/match.ts` |
| Emoji share grid, streaks, streak buddies, gem count | `src/lib/progress.ts`, `src/components/results-view.tsx` |
| Unlimited digs, the full Archive, and Shafts (themed packs). Everything is free for now. | `src/app/*.tsx` |
| Friends by code, global "deeper than X%" rank, friends' answers | `src/lib/social.ts`, `supabase/schema.sql` |
| **TNT Toss** multiplayer: public quick play, private rooms, pass-and-play | `src/game/tnt.ts`, `src/hooks/use-online-room.ts` |

Everything works offline except friends, ranks and online TNT Toss. Those switch on when the Supabase env vars are set.

## Run it

Requires **Node 22.13+** (React Native 0.88). Then:

```bash
npm install
npx expo start          # scan the QR code with Expo Go, or press w for web
npm test                # content checks + game engine simulation
npm run typecheck && npx expo lint
```

## Turn on online features (Supabase, free tier is fine)

1. Create a project at supabase.com.
2. In the SQL Editor, run `supabase/schema.sql`.
3. Go to Authentication → Sign In / Providers and enable **Anonymous sign-ins**.
4. Copy `.env.example` to `.env` and fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Multiplayer uses Supabase Realtime (presence plus broadcast). The longest-connected player's phone runs the game. If the host leaves, the next player takes over automatically.

## Ship to the stores

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform all --profile production
npx eas-cli@latest submit --platform ios      # needs an Apple Developer account ($99/yr)
npx eas-cli@latest submit --platform android  # needs a Google Play Console account ($25 once)
```

Before submitting:

- Replace the placeholder icons and splash in `assets/`, and the bundle id `com.deepvein.app` in `app.json`.
- Publish a privacy policy URL. The app stores an anonymous id, display name, scores and answers.
- In-app account deletion is already included (Miner → "Delete my online data"), which Apple requires.

## Adding content

Prompts live in `src/content/prompts/*.ts`. Each answer is `"Canonical|alias|alias"`, placed in exactly one tier list, and each prompt has exactly one `diamond`. Anything not listed counts as a miss, so be thorough with closed sets. Run `npm test` after editing. It catches alias collisions, wrong counts for closed sets, and matching regressions.

The daily schedule cycles through every prompt before repeating any. With 75 prompts that's about 10 days per cycle, so more prompts are still the top priority before launch. There is one shaft per category; raise `levels` in `src/content/shafts.ts` as categories grow.

When players report a correct answer that was marked as a miss, add it as an alias (`"Canonical|alias"`) or a new entry, and add a line to `MATCH_CASES` in `scripts/validate-content.ts` so it stays fixed.
