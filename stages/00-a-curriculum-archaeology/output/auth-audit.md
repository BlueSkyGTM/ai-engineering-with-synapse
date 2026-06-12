# Auth Audit
<!-- Derived from: site-new/js/auth.js, api/auth.js, api/_lib/auth.js -->
<!-- Capture date: 2026-06-12 | Git hash: 56e1283 -->

## Auth mechanism

GitHub OAuth, server-side. Flow:

```
User clicks "Sign in"
  → GET /api/auth
    → GitHub OAuth authorize (scope: read:user)
  → GitHub redirects to /api/auth/callback with code
    → Server exchanges code for token
    → Sets sa_user cookie: "login:avatar_url" (URL-encoded)
  → Client (site-new/js/auth.js) reads sa_user cookie on load
    → If cookie present: swaps AIS.store adapter to vercelAdapter
    → Renders avatar + username in header button
    → Progress reads/writes go to /api/progress (Vercel KV)
  → On logout: GET /api/logout → clears cookie → adapter reverts to localStorage
```

## Session model

Cookie name: `sa_user`  
Format: `{login}:{avatar_url}` (URL-encoded, colon-separated)  
Persistence: cookie-based (no JWT, no session store — cookie IS the session)  
Auth state: stateless on client — presence of valid `sa_user` cookie = authenticated

Progress adapter pattern (`site-new/js/store.js`):
```javascript
// Local (unauthenticated)
localAdapter: { read() → localStorage, write(p) → localStorage }

// Vercel (authenticated)
vercelAdapter: { read() → GET /api/progress, write(p) → POST /api/progress }
```

Swap is one line: `AIS.store.adapter = vercelAdapter`  
No page code changes needed — all screens call `store.read()` and `store.write()`.

## Known failure modes

| Mode | Symptom | What Stage 07 must handle |
|------|---------|--------------------------|
| Cookie parse failure | `getSaUser()` returns null, user treated as unauthenticated even if OAuth succeeded | Graceful fallback to localStorage — currently handled (silent) |
| Avatar URL missing | `colon === -1` in cookie value → returns null | Handled: `colon > 0` check, returns null instead of throwing |
| Store not loaded at cookie-check time | `window.AIS.store` undefined when auth.js runs | Handled: DOMContentLoaded listener swaps adapter if store loads late |
| `/api/progress` write fails | Progress write throws (network error, Vercel down) | Handled: silent catch — local copy already written, remote write fails silently |
| `/api/progress` read fails | Returns null → store falls back to empty state | Handled: null check → returns null, store treats as fresh state |
| **GitHub OAuth not configured** | `GITHUB_CLIENT_ID` env var missing → redirect to undefined | **UNHANDLED** — no guard in api/auth.js. Silent redirect to garbage URL. Stage 07 must add env validation. |
| **SITE_URL not set** | `redirect_uri` points to undefined → OAuth callback breaks | **UNHANDLED** — `api/auth.js` uses `process.env.SITE_URL` without fallback. Stage 07 must add fallback. |

## Stage 07 implications

1. **OAuth env guard**: add `GITHUB_CLIENT_ID` + `SITE_URL` existence check at API startup. Fail loudly with a readable error, not a silent broken redirect.

2. **Student identity in Helix**: `sa_user` cookie carries `login` (GitHub username) + `avatar` URL. Helix student state needs a stable user ID — GitHub username is stable enough, but Stage 07 must decide: use raw GitHub login as the Helix user key, or hash it. Decision belongs in `student-state-options.md` (output of 00-d).

3. **Progress schema**: current `/api/progress` stores `{ v: 1, done: {}, days: [], updatedAt: 0 }`. Helix FSRS state is additive — extend the schema, do not replace it. Stage 07 must design a non-breaking extension.

4. **Logout resets Helix state**: current `adapter.clear()` zeroes progress. Must NOT zero FSRS card state on logout — FSRS state is long-term memory, not session state. Stage 07 must separate session progress (cleared on logout) from FSRS state (persistent).

## Auth files reference

| File | Role |
|------|------|
| `api/auth.js` | Initiates GitHub OAuth — reads `GITHUB_CLIENT_ID`, `SITE_URL` env vars |
| `api/_lib/auth.js` | OAuth callback handler (inferred — not read in this audit; extend this audit if needed) |
| `site-new/js/auth.js` | Client cookie reader + adapter swapper + header button renderer |
| `site-new/js/store.js` | Progress persistence — adapter pattern (localStorage ↔ Vercel) |
