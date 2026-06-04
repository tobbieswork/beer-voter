# Code Review Checklist Skill

A systematic checklist for AI agents and human developers to evaluate pull requests, code modifications, and feature implementations.

## Usage

Activate this skill whenever:

- Reviewing a code change or Git diff.
- Finalizing a feature implementation.
- Refactoring existing files.

---

## 1. Code Quality & Standards

- [ ] **TypeScript Types**: Ensure no `any` is used (Strict Any Type Rule). Verify strict type definitions.
- [ ] **Formatting**: Ensure files are styled using the project's Prettier config.
- [ ] **Naming & Language**: Verify that identifiers are in English and comments are in Vietnamese (Tiếng Việt).
- [ ] **Dead Code**: Ensure no unused imports, variables, console logs, or commented-out draft code is committed.

## 2. Logic & Correctness

- [ ] **Edge Cases**: Check for potential `null` or `undefined` dereferences (e.g. `user?.id` instead of `user.id` when `user` can be null).
- [ ] **Asynchronous Operations**: Ensure promises are properly awaited and errors are caught using `try/catch`.
- [ ] **State Side-Effects**: Verify React state is not mutated directly, and dependencies are correctly specified in `useEffect`/`useCallback`/`useMemo` blocks.

## 3. Architecture & Patterns

- [ ] **Data Locality**: Verify state is lifted to the appropriate component ancestor and passed down or managed via dedicated custom hooks.
- [ ] **No Styling Frameworks**: Ensure no Tailwind, CSS modules, or inline CSS styles are added; keep styles in `App.css` and `index.css`.
- [ ] **Single Process Backend**: Ensure the Express backend router is cleanly structured and database sync is kept in-memory with async flushes.

## 4. Performance & Security

- [ ] **Rate Limiting**: Check that WebSocket events and API requests enforce correct user limits.
- [ ] **PIN Authorization**: Verify PIN validation headers are checked for protected event modifications.
- [ ] **Bundle Size**: Avoid importing massive external libraries when vanilla helpers can achieve the same result.
