# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start React dev server (port 5173) + Express server (port 3001) concurrently
npm run build      # Build React to /dist
npm run start      # Start Express server serving built React + WebSocket (port 3001)
npm run lint       # ESLint check
npm run client     # React dev server only
npm run preview    # Vite preview of production build
```

There are no automated tests in this project.

## Architecture

**BeerVote** is a real-time beer party planning app (Vietnamese audience). Single-repo full-stack TypeScript.

### Server (`server/index.ts`)

Express on port 3001 serves three things from one process:

- REST API at `/api/*`
- Static React build (SPA fallback to `index.html`)
- WebSocket server on the same port

**Database layer** is dual-mode: Supabase if `SUPABASE_URL` + `SUPABASE_KEY` env vars are present, otherwise falls back to `server/db.json`. An in-memory cache (`cacheDB`) sits in front of both to avoid repeated I/O. Writes go to the cache immediately and sync to storage asynchronously.

### Frontend (`src/`)

React 19 with no router library — navigation is URL-parameter based (`?eventId=...`). Global state (current user, events list, WebSocket connection) lives in `App.tsx` via `useState`/`useRef`/`useCallback`. User identity is stored in `localStorage` (userId, nickname, realName, username).

### Real-time sync

WebSocket is the primary sync mechanism. Client sends typed messages (`VOTE_TOGGLE`, `ADD_OPTION`, `ADD_COMMENT`, `LOCK_EVENT`, `JOIN_EVENT`, `JOIN_DASHBOARD`); server updates the cache, persists, and broadcasts `EVENT_UPDATED` or `DASHBOARD_UPDATED` to all subscribed clients. Client auto-reconnects after 3 s on disconnect.

### Auth / permissions

Guest-based (no login). Anyone can create events, vote, propose options, and comment. Only the event creator can lock an event (finalizes choices and starts a countdown).

### Data model

`Events → Options (datetime/location/beer type) → Votes → Comments`

### Key files

| Path                             | Role                                                               |
| -------------------------------- | ------------------------------------------------------------------ |
| `server/index.ts`                | All backend logic: REST routes, WebSocket handlers, DB abstraction |
| `server/db.json`                 | Local JSON database (dev / no-Supabase fallback)                   |
| `src/App.tsx`                    | Root state, WebSocket lifecycle, routing                           |
| `src/components/EventDetail.tsx` | Core voting/commenting/lock UX                                     |
| `src/utils/date.ts`              | Vietnamese datetime formatter used across components               |
