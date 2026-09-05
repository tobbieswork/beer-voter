# AGENTS.md

## Commands

```bash
npm run dev         # Concurrent: Vite (5173) + Express/WS (3001). Vite proxies /api -> 3001.
npm run build       # Vite build -> dist/
npm run start       # Production: single Express+WS server (3001) serving dist/ + API + WS
npm run server      # Express+WS only (tsx server/index.ts) — also used standalone for LAN sharing
npm run client      # Vite dev server only (5173)
npm run lint        # ESLint — checks *.js/*.jsx AND *.ts/*.tsx (via typescript-eslint)
npm run format      # Prettier — format all files
npm run format:check # Prettier — check formatting without changes
npm run preview     # Vite preview of production build
```

No `typecheck` script — always run `npx tsc --noEmit` after changes (type errors won't block dev/build).
No automated tests — `tests/` directory exists but is empty.
Verify in order: `npm run lint` then `npx tsc --noEmit` then `npm run format:check`.

## Architecture

Single-repo full-stack TypeScript. Vanilla CSS, no framework.

### Server (`server/index.ts`) — ~747 lines, entire backend

One Express process on port 3001 serves three things:

- REST API at `/api/*`
- WebSocket server (same port, via `http.Server` + `ws`)
- Static files from `dist/` with SPA fallback — ONLY when `dist/` exists (production)

**Important:** `server/index.ts` requires `/* global process */` directive for TS to recognize `process.env`. Always keep it on line 1.

### Database: dual-mode, single-process cache

- **Supabase**: If `SUPABASE_URL` + `SUPABASE_KEY` are set, entire DB is one JSON blob in `beer_voter_data` table (key=`main_db`). Not relational.
- **Local**: Falls back to `server/db.json`.
- **Cache**: In-memory `cacheDB` front. Writes update cache, then `syncDB()` persists async with pending write coalescing.
- No connection pooling, no migrations, no multi-process consistency.

### Frontend (`src/`)

React 19. No router library — navigation is URL-parameter based (`?eventId=...`) with manual `history.pushState`. Global state (user, events, WS) lives in `App.tsx`.

### Cross-cutting: types in src/types/

Shared interfaces (`User`, `EventData`, `EventOption`, `EventVote`, `EventComment`, `OptionPayload`, `CommentPayload`, `LockPayload`) are exported from `src/types/index.ts`. Import them from `'../types'` (relative to `src/components/`).

## Styling: Global CSS, no framework

- **No CSS framework** (no Tailwind, no CSS modules, no styled-components).
- All styles are global, concentrated in two files:
  - `src/App.css` (~1819 lines) — component styles, responsive breakpoints, animations, modals
  - `src/index.css` (~104 lines) — `:root` CSS variables, resets, base styles
- CSS variables in `:root` (`index.css`) define the dark amber/gold glassmorphism theme. Use `var(--accent-gold)`, `var(--bg-card)`, etc.
- Common class patterns: `.card-pub`, `.btn-primary`, `.btn-secondary`, `.modal-overlay`, `.modal-pub`, `.form-group`
- Responsive: 4 breakpoints at 1024px, 768px, 480px, 360px + iOS `@supports (padding: max(0px))` for safe-area insets
- When adding a new component, add its CSS to `App.css` (not a separate file) and use existing patterns

### Font

- `Outfit` from Google Fonts (weights 300-800) — loaded in `index.css`

## Auth & PIN

- **Guest**: Pick a nickname, stored in localStorage
- **Google OAuth**: `@react-oauth/google` client + `google-auth-library` server verify at `POST /api/auth/google`. Needs `GOOGLE_CLIENT_ID` env.
- **Event PIN**: 6-digit, SHA-256 hashed. Verified via `POST /api/events/:id/verify-pin` → `{ valid, pinToken }`. Token has 24h TTL, in-memory only (lost on restart).
- Server enforces PIN on `GET /api/events/:id` (`X-Pin-Token` header → 403), `WS JOIN_EVENT`, and all mutation WS handlers.
- Creator has NO bypass — forgotten PIN locks everyone out.

### localStorage keys

| Prefix                             | Purpose                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `beervote_user_*`                  | User identity (id, nickname, realName, username, avatar, googleId, authMethod) |
| `beervote_pin_token_<eventId>`     | Verified PIN token per event                                                   |
| `beervote_creator_token_<eventId>` | Creator auth token for lock/unlock/delete                                      |
| `beervote_visited_events`          | Array of visited event IDs                                                     |

## WebSocket protocol

500ms rate limit per client. Auto-reconnect after 3s.

| Client → Server                                   | Server → Client                      |
| ------------------------------------------------- | ------------------------------------ |
| `JOIN_EVENT` (eventId, pinToken?)                 | `EVENT_UPDATED` (eventId, eventData) |
| `JOIN_DASHBOARD`                                  | `DASHBOARD_UPDATED` (events)         |
| `VOTE_TOGGLE` (eventId, optionId, pinToken?)      | `EVENT_DELETED` (eventId)            |
| `ADD_OPTION` (eventId, optType, value, pinToken?) |                                      |
| `ADD_COMMENT` (eventId, content, pinToken?)       |                                      |
| `LOCK_EVENT` (eventId, creatorToken, pinToken?)   |                                      |
| `UNLOCK_EVENT` (eventId, creatorToken, pinToken?) |                                      |

WS URL auto-detects dev vs production: port 5173 → `ws://localhost:3001`, otherwise same host.

## Data model

`Events → Options (datetime/location/beer) → Votes → Comments`

## Lint / Type quirks

- `eslint.config.js` covers both `**/*.{js,jsx}` and `**/*.{ts,tsx}` (via typescript-eslint)
- `eslint-config-prettier` is integrated — disables format-conflicting ESLint rules
- Prettier config (`.prettierrc`): semis, single quotes, trailing commas (es5), 2-space indent, 100 print width
- `vite.config.js` is `.js` (not `.ts`)
- `tsconfig.json`: strict mode on, but `noUnusedLocals` and `noUnusedParameters` are `false`
- `src/vite-env.d.ts` provides `import.meta.env` types — don't delete
- Both `src/` and `server/` compile under the same tsconfig (bundler module resolution)
- **Strict Any Type Rule**: Do NOT use `any` types in any backend or frontend TS files. Do NOT use `/* eslint-disable @typescript-eslint/no-explicit-any */` or similar comments to bypass compiler / linter rules. Always specify explicit type interfaces, even for row structures coming from database adapters.

## Code conventions

- Vietnamese comments in code, English identifiers
- Prettier handles formatting — run `npm run format` to auto-format changes
- No `.cursor/rules/`, no `.github/`, `opencode.json` present with reviewer agent
- Server uses `express.json()` middleware; always send JSON with `Content-Type: application/json`

## Env vars (`.env.example`)

| Var                     | Used by  | Notes                             |
| ----------------------- | -------- | --------------------------------- |
| `VITE_GOOGLE_CLIENT_ID` | Frontend | Google OAuth client ID            |
| `GOOGLE_CLIENT_ID`      | Server   | Google token verification         |
| `SUPABASE_URL`          | Server   | Optional. Triggers cloud DB mode. |
| `SUPABASE_KEY`          | Server   | Optional. Service role key.       |
| `ALLOWED_ORIGINS`       | Server   | Comma-separated CORS whitelist.   |
| `PORT`                  | Server   | Default 3001.                     |

## Key files

| Path                                | Role                                                            |
| ----------------------------------- | --------------------------------------------------------------- |
| `server/index.ts`                   | Entire backend: REST, WS, DB, auth, static serving (~747 lines) |
| `server/db.json`                    | Local DB fallback                                               |
| `src/App.tsx`                       | Root state, WS lifecycle, routing, shared types                 |
| `src/App.css`                       | All component styles (~1819 lines, global CSS)                  |
| `src/index.css`                     | CSS variables, resets, fonts                                    |
| `src/components/EventDetail.tsx`    | Core voting/commenting/lock UX (~746 lines)                     |
| `src/components/Dashboard.tsx`      | Event list page                                                 |
| `src/components/GuestJoinModal.tsx` | Guest signup + Google OAuth modal                               |
| `src/components/PartyPinModal.tsx`  | 6-digit PIN entry                                               |
| `src/components/Countdown.tsx`      | Locked-event countdown timer                                    |
| `src/components/BeerBubbles.tsx`    | Animated background bubbles                                     |
| `src/utils/date.ts`                 | Vietnamese datetime formatter                                   |

## Suggestions (future improvements)

These are high-impact changes that would improve developer experience. Not all are implemented yet.

1. ~~**TypeScript ESLint**: ~~Done. `typescript-eslint` added, all `.ts/.tsx` files now linted.

2. ~~**Prettier**: ~~Done. Formatted all files, integrated with ESLint.

3. ~~**Extract shared types**: ~~Done. All 8 interfaces moved to `src/types/index.ts`.

4. **CSS framework or modules**: `App.css` at ~1819 lines is hard to maintain. Consider CSS Modules (`*.module.css`) per component, or migrate to Tailwind for utility-first styling. Would eliminate class name collisions and collocate styles with components.

5. **Split server into modules**: `server/index.ts` at ~747 lines could be split into `routes/`, `handlers/`, and `db/` directories for better maintainability.

6. **Add AI agent rules**: `opencode.json` present with reviewer agent. Could add more specialized agents or integrate with `.cursor/rules/`.

7. ✅ **GitHub Actions CI**: `.github/workflows/ci.yml` added. Runs on push/PR to `main`: lint, typecheck, format check, build. Enable branch protection in GitHub settings to require CI passes.

8. **Any Type Cleanliness**: Completed clean-up of `any` types in database, REST handlers, and Websocket event loops. Fully typed row mapping structures to ensure standard compliance.

9. **Database Architecture (Users Table)**: Currently, Google OAuth users are stateless (only stored in browser localStorage) while Guest users are saved to the `guests` table. For better data integrity and centralized management, the `guests` table should be renamed/migrated to a unified `users` table. The backend should UPSERT Google users into this table during the `/api/auth/google/callback` flow so all votes, comments, and events can be tied to a real database row.
