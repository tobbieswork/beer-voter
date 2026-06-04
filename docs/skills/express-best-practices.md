# Express & WebSockets Best Practices Skill

Core standards for building fast, robust, and secure server applications using Express and WebSockets in TypeScript.

## Usage

Activate this skill when:

- Adding or editing REST API routes (`server/routes/`).
- Configuring WebSockets events or rate-limiting.
- Updating database queries or sync mechanisms.

---

## 1. REST APIs & Route Design

- **JSON Middleware**: Ensure route requests are parsed via `express.json()` and responses are returned with correct JSON content headers.
- **Input Validation**: Validate body payloads before performing database syncs.
- **Error Boundaries**: Wrap async route handlers to catch exceptions and forward them to Sentry and Express centralized error handlers.

## 2. In-Memory Cache & Storage Sync (Dual-Mode DB)

- **Memory-first reading**: Read operations should resolve from `cacheDB` for maximum speed.
- **Deferred Persistency**: Database updates should modify the `cacheDB` synchronously, and flush asynchronously to file-system (`db.json`) or Supabase using the coalesced `syncDB()` routine.
- **Strict Typing**: Map Supabase response payload definitions strictly to typescript models. Do not bypass type checks.

## 3. WebSockets Protocols

- **State Subscription**: Clients use WebSocket connections to trigger real-time broadcasts (e.g. `EVENT_UPDATED`, `DASHBOARD_UPDATED`). Keep WebSocket event handlers lightweight.
- **Rate-Limiting**: Enforce a minimal time barrier (e.g., 500ms) between client events on the socket connections to avoid flood/DoS.
- **Authorization & Security**: Enforce PIN tokens for accessing or changing private event details over WS channels.
