# React Best Practices Skill

Core standards for writing clean, optimized, and performant React 19 applications using vanilla CSS and custom hooks.

## Usage

Activate this skill when:

- Creating or editing React components.
- Designing state management flows.
- Writing styling or layout changes.

---

## 1. State Management & Hooks

- **Use Custom Hooks**: Extract WebSocket interactions, local storage operations, and authentication logic into dedicated custom hooks under `src/hooks/` (e.g. `useWebSocket.ts`, `useUser.ts`).
- **State Lifting**: Lift state up to the closest common ancestor instead of nesting state too deep.
- **Avoid Over-rendering**: Memoize expensive computations with `useMemo` and event handlers with `useCallback` when passing them to optimized child components.

## 2. Rendering & Lifecycle

- **Cleanups**: Always return cleanups in `useEffect` (e.g. clearing timers, removing event listeners, closing WebSocket streams).
- **React 19 Form Actions**: Utilize standard form submission and state handlers instead of complex custom async lifecycle hooks where possible.
- **Dynamic lists**: Always use stable, unique keys (`key={item.id}`) when rendering dynamic arrays. Avoid using the array index as a key.

## 3. Styling & Layout Integration

- **Vanilla CSS Variable Hierarchy**: Use custom properties defined in `:root` inside `src/index.css` (e.g. `var(--accent-gold)`, `var(--bg-card)`).
- **Responsive Layouts**: Design with fluid flexbox and grid layouts, respecting the four breakpoints (1024px, 768px, 480px, 360px).
- **Glassmorphism**: Match the dark gold amber theme utilizing `backdrop-filter: blur(...)` combined with translucent borders and backgrounds.
