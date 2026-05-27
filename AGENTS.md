# AGENTS.md

## Commands

```bash
npm run dev       # Concurrent: Vite (5173) + Express/WS (3001). Vite proxies /api -> 3001.
npm run build     # Vite build -> dist/
npm run start     # Production: single Express+WS server (3001) serving dist/ + API + WS
npm run server    # Express+WS only (tsx server/index.ts) — used by npm run dev
npm run client    # Vite dev server only (5173)
npm run lint      # ESLint only checks .js/.jsx, NOT .ts/.tsx files
npm run preview   # Vite preview of production build
```

No `typecheck` script — always run `npx tsc --noEmit` after changes (type errors won't block dev/build).
No automated tests — `tests/` directory exists but is empty.
Always run both `npm run lint` and `npx tsc --noEmit` to verify changes.

## Architecture

Single-repo full-stack TypeScript. All backend logic lives in one file: `server/index.ts`.

### Server (`server/index.ts`)

One Express process on port 3001 serves three things:
- REST API at `/api/*`
- WebSocket server (same port, via `http.Server` + `ws`)
- Static files from `dist/` with SPA fallback (`index.html`) — only when `dist/` exists

### Database: dual-mode, single-process cache

- **Supabase**: If `SUPABASE_URL` + `SUPABASE_KEY` are set, entire DB is fetched/stored as one JSON blob in the `beer_voter_data` table (key-value store, key=`main_db`). Not a relational schema.
- **Local**: Falls back to `server/db.json`.
- **Cache**: In-memory `cacheDB` sits in front of both. Writes update cache immediately, then `syncDB()` persists async with dedup (pending write coalescing).
- There is no connection pooling, no multi-process consistency, no migrations.

### Frontend (`src/`)

React 19. No router — navigation is URL-parameter based (`?eventId=...`). Global state (user, events, WS connection) lives in `App.tsx`. User identity stored in `localStorage`.

### Auth

Dual mode:
- **Guest**: Pick a nickname, stored in localStorage
- **Google OAuth**: `@react-oauth/google` on client, Google ID token verified server-side via `google-auth-library` at `POST /api/auth/google`. Requires `GOOGLE_CLIENT_ID` env on server.

### Event PIN

Events can have an optional 6-digit PIN (`partyPinHash`, SHA-256, stored on server). Verified via `POST /api/events/:id/verify-pin` which returns `{ valid, pinToken }`. The `pinToken` is a UUID stored in an in-memory Map with 24h TTL, invalidated on server restart.

Server enforces PIN on:
- `GET /api/events/:id` (requires `X-Pin-Token` header → 403 if missing/invalid)
- WS `JOIN_EVENT` (validates `pinToken`, caches in `clientInfo.verifiedPinTokens` for the session)
- All WS mutation handlers (`VOTE_TOGGLE`, `ADD_OPTION`, `ADD_COMMENT`, `LOCK_EVENT`, `UNLOCK_EVENT`) validate inline `action.pinToken` with `clientInfo.verifiedPinTokens` fallback

Client helpers: `getPinToken`, `savePinToken`, `clearPinToken` (in `src/App.tsx`).

Client flow:
1. Navigate to PIN-protected event → `fetchEventDetail` 403 → `clearPinToken` → show PIN modal
2. User enters PIN → `verify-pin` returns `{ valid, pinToken }` → `savePinToken` → re-fetch event detail (200) → `JOIN_EVENT` with `pinToken`
3. All mutation WS messages include inline `pinToken` (from `getPinToken`)
4. On WS reconnect, `ws.onopen` sends `JOIN_EVENT` with `pinToken` from localStorage
5. Creator has no bypass — if PIN is forgotten, the creator is locked out too

### WebSocket

Client sends typed messages (`VOTE_TOGGLE`, `ADD_OPTION`, `ADD_COMMENT`, `LOCK_EVENT`, `UNLOCK_EVENT`, `JOIN_EVENT`, `JOIN_DASHBOARD`). Server updates cache, persists, broadcasts `EVENT_UPDATED` / `DASHBOARD_UPDATED` / `EVENT_DELETED` to subscribers. 500ms rate limit per client.

### Data model

`Events -> Options (datetime/location/beer) -> Votes -> Comments`

## Env vars (`.env.example`)

| Var | Used by | Notes |
|-----|---------|-------|
| `VITE_GOOGLE_CLIENT_ID` | Frontend | Google OAuth client ID |
| `GOOGLE_CLIENT_ID` | Server | Google token verification |
| `SUPABASE_URL` | Server | Optional. Triggers cloud DB mode. |
| `SUPABASE_KEY` | Server | Optional. Service role key. |
| `ALLOWED_ORIGINS` | Server | Comma-separated CORS whitelist. |
| `PORT` | Server | Default 3001. |

## Lint / Type quirks

- ESLint only applies to `**/*.{js,jsx}` — TypeScript files are NOT linted
- `tsconfig.json` strict mode on, but `noUnusedLocals` and `noUnusedParameters` are explicitly `false`
- `src/vite-env.d.ts` provides `import.meta.env` types for Vite — don't delete it
- Both `src/` and `server/` are compiled under the same tsconfig

## Key files

| Path | Role |
|------|------|
| `server/index.ts` | Entire backend: REST, WS, DB, auth, static serving (~747 lines) |
| `server/db.json` | Local DB fallback |
| `src/App.tsx` | Root state, WS lifecycle, routing |
| `src/components/EventDetail.tsx` | Core voting/commenting/lock UX |
| `src/components/Dashboard.tsx` | Event list page |
| `src/utils/date.ts` | Vietnamese datetime formatter |
