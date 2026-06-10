# Progress Sync Debug — Paused

## Symptom
Progress toggled on `course.html` does not persist on refresh or across browsers (incognito).

## What works
- OAuth flow completes → `sa_user` + `sa_token` cookies set ✓
- Page load → GET `/api/progress` returns 200 ✓
- `window.AIS.store.adapter` IS the `vercelAdapter` (new store.js loaded) ✓
- `store.toggle(0,0)` returns `true` ✓

## The unsolved mystery
Calling `adapter.write(cache)` OR a bare `fetch('/api/progress', { method:'POST', ... })`
returns a fulfilled Promise but **no POST appears in the Network tab** and **no Vercel log entry**.

This rules out:
- Wrong adapter (adapter is correct)
- Bad JWT / 401 (no request reaching server at all)
- Fire-and-forget timing (direct write also disappears)
- Service worker (none registered)

## Next session: try these
1. **Check Network tab filter** — must be "All", no text filter, Preserve Log ON
2. **Test from a fresh incognito tab** (rule out extension interference)
3. **Check for browser extension** blocking outbound fetch (uBlock, etc.)
4. **Try `XMLHttpRequest` instead of fetch** — if XHR shows but fetch doesn't, it's a browser quirk
5. **Check if `keepalive: true` is the problem** — some browsers reject keepalive POSTs silently
   - Try removing `keepalive: true` from `vercelAdapter.write()` in store.js

## Files changed (all deployed)
- `site-new/js/store.js` — vercelAdapter defined here, hasSaUser() check in init()
- `api/progress.js` — GET/POST with logging, rejects bad body with 400
- `api/_lib/auth.js` — JWT + Upstash helpers

## Last Vercel log (proof the API works)
```
GET /api/progress  200  [progress] GET sa:progress:15303234…
```
Only GETs, never a POST — confirms the write never reaches the server.
