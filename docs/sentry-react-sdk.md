# Sentry React SDK Setup Guide

This guide describes the Sentry SDK integration settings configured for this project.

## Key `Sentry.init()` Options

| Option                     | Type     | Default        | Notes                                 |
| -------------------------- | -------- | -------------- | ------------------------------------- |
| `dsn`                      | `string` | —              | **Required.** SDK disabled when empty |
| `environment`              | `string` | `"production"` | e.g., `"staging"`, `"development"`    |
| `tracesSampleRate`         | `number` | —              | 0–1; `1.0` in dev, `0.1–0.2` in prod  |
| `replaysSessionSampleRate` | `number` | —              | Fraction of all sessions recorded     |
| `replaysOnErrorSampleRate` | `number` | —              | Fraction of error sessions recorded   |

## Verification

To verify that Sentry is receiving data, trigger test events:

### Test Code

You can add a temporary test button anywhere in your React frontend (e.g. in [src/App.tsx](file:///Users/tobbiesng/Code/beer-voter/src/App.tsx)):

```tsx
import * as Sentry from '@sentry/react';

function SentryTestButton() {
  return (
    <button
      onClick={() => {
        throw new Error('Sentry React test error');
      }}
    >
      Trigger Test Error
    </button>
  );
}
```

Or trigger an Express crash on the backend (e.g. in [server/index.ts](file:///Users/tobbiesng/Code/beer-voter/server/index.ts)):

```typescript
app.get('/api/debug-sentry', (req, res) => {
  throw new Error('Sentry Express backend test error!');
});
```
