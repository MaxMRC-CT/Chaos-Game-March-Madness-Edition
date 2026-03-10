# Chaos League — Production Deploy Hardening Audit

**Audit date:** March 10, 2025  
**Scope:** Full production-readiness review focused on crash prevention, SSR safety, and lifecycle stability.

---

## 1. Unsafe .length / Array Access Patterns

### High‑risk (can cause "Cannot read properties of undefined (reading 'length')")

| Location | Issue | Safe pattern |
|----------|-------|--------------|
| `my-league-client.tsx:49-53, 118` | `payload.standings.length`, `payload.standings.forEach` — API error or partial JSON can return `payload` without `standings`. | Normalize payload before use: `const standings = payload?.standings ?? []` |
| `my-league-client.tsx:77-86` | `data.teamResults`, `data.picks` iterated without guards when `data` exists but arrays are undefined. | Use `(data.teamResults ?? []).forEach`, or normalize at boundary. |
| `pre-draft-war-room.tsx:194` | `data.members.length` — after fetch, `data` may have `members: undefined`. | `(data.members ?? []).length` |
| `pre-draft-war-room.tsx:252-256` | Passes `data.recentEvents`, `data.picks`, `data.members`, `data.teams` to LiveFeed without normalization. | Normalize before passing, or add defensive defaults in LiveFeed. |
| `live-feed.tsx:48-67` | `events`, `members`, `teams`, `picks` used in `for...of` and `useMemo` — if parent passes `undefined`, throws. | Add defaults: `const events = allEvents ?? [];` at top of component. |
| `event-timeline.tsx:77-92` | `events.filter`, `for (const e of filtered)`, `members`, `teams`, `picks` in useMemo — no guards. | Add: `events ?? []`, `members ?? []`, etc. at component entry. |
| `rivalries-view.tsx:69, 50-52` | `rivalryMoments.slice(0,3).map` — if `rivalryMoments` undefined, throws. `data.teams.find`, `data.members.find` — same. | `(rivalryMoments ?? []).slice(0,3)`, guard `data.teams` / `data.members`. |
| `beta-admin/page.tsx:454-466` | `snapshot.standings.map`, `snapshot.recentEvents.length`, `.slice(0,5).map` — no guards. | `(snapshot?.standings ?? []).map`, `(snapshot?.recentEvents ?? []).slice(0,5)` |

### Medium‑risk (edge cases)

| Location | Issue | Safe pattern |
|----------|-------|--------------|
| `my-team.tsx:28` | `myPicks.filter` — if parent passes undefined, throws. | `(myPicks ?? []).filter` |
| `leaderboard-panel.tsx:33-46` | `standings.slice`, `standings.sort` — assumes `standings` always array. | Parent must normalize; or add `standings ?? []` guard. |
| `rivalry-highlights-card.tsx:35` | `rivalryOnly.length === 0` — if `rivalryOnly` undefined. | `(rivalryOnly ?? []).length === 0` |

### Already safe

- **dashboard-client.tsx**: Uses `normalizeWarRoomPayload` before state; arrays normalized.
- **bracket-client.tsx**: Uses `normalizeWarRoomForBracket`; `data.teams ?? []`, `data.games ?? []` etc.
- **lib/war-room/get-data.ts**: Prisma always returns arrays; `snapshots` has try/catch fallback.

---

## 2. WarRoomResponse Assumptions

### Consumers that assume arrays exist (need normalization)

| Consumer | Assumes | Fix |
|----------|---------|-----|
| **MyLeagueClient** | `standings`, `teamResults`, `picks`, `highlightEvents`, `recentEvents`, `members`, `teams` | Apply `normalizeWarRoomPayload` (or shared normalizer) on fetch + initial. |
| **PreDraftWarRoom** | `members`, `recentEvents`, `picks`, `teams`, `highlightEvents`, `ownershipByRole` | Normalize before `setData` and before passing to LiveFeed/DashboardClient. |
| **LiveFeed** | `allEvents`, `highlightEvents`, `picks`, `members`, `teams` | Defensive defaults: `allEvents ?? []`, etc. |
| **EventTimeline** | Same as LiveFeed | Same defensive defaults. |
| **RivalriesView** | `rivalryMoments`, `data.teams`, `data.members` | Normalize incoming data or add guards. |
| **LeaderboardPanel** | `standings`, `highlightEvents`, `ownershipMap` | Parent must pass normalized data. |
| **MyTeam** | `myPicks` | Parent (DashboardClient) already normalizes. |

### Recommended: shared normalizer utility

Create `lib/war-room/normalize.ts`:

```ts
export function normalizeWarRoomPayload<T extends Record<string, unknown>>(payload: T): T & {
  games: unknown[];
  standings: unknown[];
  picks: unknown[];
  highlightEvents: unknown[];
  hotSeatMatchups: unknown[];
  teamResults: unknown[];
  recentEvents: unknown[];
  members: unknown[];
  teams: unknown[];
  myPicks: unknown[];
  standingsDelta: Record<string, number>;
  ownershipMap: Record<string, unknown[]>;
  ownershipByRole: Record<string, unknown>;
} {
  if (payload == null || typeof payload !== "object") {
    return getEmptyWarRoomShape() as T & { /* ... */ };
  }
  return {
    ...payload,
    games: Array.isArray(payload.games) ? payload.games : [],
    standings: Array.isArray(payload.standings) ? payload.standings : [],
    picks: Array.isArray(payload.picks) ? payload.picks : [],
    highlightEvents: Array.isArray(payload.highlightEvents) ? payload.highlightEvents : [],
    hotSeatMatchups: Array.isArray(payload.hotSeatMatchups) ? payload.hotSeatMatchups : [],
    teamResults: Array.isArray(payload.teamResults) ? payload.teamResults : [],
    recentEvents: Array.isArray(payload.recentEvents) ? payload.recentEvents : [],
    members: Array.isArray(payload.members) ? payload.members : [],
    teams: Array.isArray(payload.teams) ? payload.teams : [],
    myPicks: Array.isArray(payload.myPicks) ? payload.myPicks : [],
    standingsDelta: typeof payload.standingsDelta === "object" && payload.standingsDelta !== null ? payload.standingsDelta : {},
    ownershipMap: typeof payload.ownershipMap === "object" && payload.ownershipMap !== null ? payload.ownershipMap : {},
    ownershipByRole: typeof payload.ownershipByRole === "object" && payload.ownershipByRole !== null ? payload.ownershipByRole : {},
  };
}
```

- Use in: `MyLeagueClient`, `PreDraftWarRoom`, and after any `fetch` that returns WarRoomResponse.
- Bracket can keep `normalizeWarRoomForBracket` (handles null/undefined differently).

### Missing fields to normalize

- **portfolioPicks** — not in WarRoomResponse; `picks` is the portfolio data.
- **scoreSnapshots** — used server-side only; not in response.
- **events** — mapped to `recentEvents` / `highlightEvents`; normalize both.

---

## 3. Lifecycle Transition Safety

### Force Start (SETUP → LIVE)

- `startTournamentFromForm` → `startTournament` → updates status, `revalidatePath`, `redirect`.
- After redirect, dashboard page re-renders; server calls `getWarRoomData` with new status.
- **Risk**: Newly LIVE league can have `games = []`, `teamResults = []`, `standings` with zeros. Components that assume results exist can crash.

### Components that assume results exist

| Component | Assumption | Fix |
|-----------|------------|-----|
| **DashboardClient** | `data.games.length === 0` shows "Tournament hasn't started" — OK. `hotSeatMatchups[0]` — guarded by `length === 0` check. | OK. |
| **BracketClient** | Uses "Awaiting results", "No teams in this region" — handles empty. | OK. |
| **LeaderboardPanel** | `standings.length === 0` shows "Waiting for results" — OK. | OK. |
| **MyLeagueClient** | `displayStandings` from `standings` — if empty, table is empty. | Ensure `standings` is always array (normalize). |
| **LiveFeed** | `visibleEvents.length === 0` shows "No events yet" — OK. | Ensure `events` is array (normalize). |
| **RoundSummaryCard** | Only rendered when `roundSummary` exists; handles empty `cards`. | OK. |

### Auto-start (LOCKED → LIVE)

- `evaluateStatusTransitions` in `getWarRoomData` handles LOCKED → LIVE.
- Same empty-state risks as Force Start; normalization fixes them.

### Critical path: PreDraftWarRoom → DashboardClient on LIVE

- When poll returns LIVE, PreDraftWarRoom renders `<DashboardClient initial={data} />` with raw `data`.
- **Issue**: `data` from `setData(payload)` is **not** normalized; DashboardClient normalizes in `useState` initializer, so first render is safe.
- **Recommendation**: Normalize in PreDraftWarRoom before `setData` so all consumers see normalized data consistently.

---

## 4. SSR vs Client Fetch Safety

### Server components

| Page | Data loading | Safe? |
|------|--------------|-------|
| `dashboard/page.tsx` | `getWarRoomData(leagueId)` (Prisma) | Yes — no relative fetch. |
| `standings/page.tsx` | Same | Yes. |
| `bracket/page.tsx` | Same | Yes. |

### Client components (relative fetch)

- All use `fetch(\`/api/war-room?leagueId=...\`)` — correct for client-side (resolved to same origin).
- No server components use `fetch('/api/...')` for data.

### Localhost references

- `scripts/smoke-sim.ts`: `BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"` — script only; OK.
- No production code references localhost.

---

## 5. ENV Safety Review

### Server-only usage (OK)

- `process.env.ENV_NAME`, `process.env.DEV_PANEL_KEY`, `process.env.DATABASE_URL`, `process.env.BETA_ADMIN_KEY` — used in API routes or server logic only.

### Client bundle risk

| File | Usage | Risk |
|------|-------|------|
| `bracket-client.tsx:416, 479, 497` | `process.env.NODE_ENV === "development"` | OK — `NODE_ENV` is replaced at build; no secret. |
| `page.tsx:73` | `process.env.NODE_ENV === "development"` | OK. |
| `lib/war-room/get-data.ts:386` | `process.env.ENV_NAME === "development"` | Server-only — get-data is never imported by client. |

### Prisma / ENV

- Prisma used only in server code (`lib/db.ts`, API routes, server actions).
- No client bundle imports Prisma.

**Verdict**: ENV usage is safe. Ensure no `NEXT_PUBLIC_*` vars contain secrets.

---

## 6. Production Fallback Strategy

### Top-level render paths

| Component | Current | Recommended |
|-----------|---------|-------------|
| DashboardClient | Normalizes in useState | Keep; ensure PreDraftWarRoom also normalizes before passing. |
| BracketClient | Normalizes; shows "No teams loaded" | OK. |
| MyLeagueClient | No normalization; can crash on bad payload | Add normalization on load + initial. |
| PreDraftWarRoom | No normalization | Add normalization before `setData` and before passing to children. |
| Standings page | Passes `initial` which can be null | MyLeagueClient already handles null; add normalization when non-null. |

### Loading / empty states

- Add loading placeholders where `initial` is null and fetch is in progress.
- "No results yet" / "Awaiting results" already used in Bracket, Leaderboard, LiveFeed, Hot Seat.
- Ensure `standings` table renders empty array without crashing.

### API error handling

- War-room API returns `{ error: string }` on 404/500. Clients that do `const payload = await response.json()` and use it as WarRoomResponse will crash.
- **Fix**: Check `response.ok` and `payload.error`; on error, set error state, do not call normalizer on invalid payload.

---

## 7. Prioritized Fix Order

### P0 — Production crash prevention (do first)

1. **Normalize WarRoomResponse at all boundaries**
   - Extract shared `normalizeWarRoomPayload` (or use existing from dashboard-client, moved to `lib/war-room/normalize.ts`).
   - Apply in: `MyLeagueClient` (on fetch + initial), `PreDraftWarRoom` (on fetch + before passing to children).

2. **Guard API error responses**
   - In all `fetch` callers: if `!response.ok` or `payload?.error`, set error state and do not treat payload as WarRoomResponse.

3. **Add defensive defaults in LiveFeed and EventTimeline**
   - `allEvents ?? []`, `highlightEvents ?? []`, `picks ?? []`, `members ?? []`, `teams ?? []` at component entry.

### P1 — Force-live and empty-state stability

4. **PreDraftWarRoom → DashboardClient handoff**
   - Normalize `data` before passing to DashboardClient when transitioning to LIVE.

5. **RivalriesView**
   - `rivalryMoments ?? []`, guard `data.teams` and `data.members` in `formatRivalryMoment`.

6. **MyLeagueClient standings / portfolio**
   - Normalize `payload` before `setData`; ensure `standings`, `teamResults`, etc. are always arrays.

### P2 — Beta-admin and edge cases

7. **Beta-admin snapshot**
   - `(snapshot?.standings ?? []).map`, `(snapshot?.recentEvents ?? []).slice(0,5)`.

8. **MyTeam**
   - `(myPicks ?? []).filter` for extra safety (parent should already normalize).

---

## Summary

- **Root cause** of "Cannot read properties of undefined (reading 'length')": WarRoomResponse consumers assume arrays exist; API can return partial/error payloads, and newly LIVE leagues have sparse data.
- **Main fix**: Single shared normalizer used at every boundary (fetch, initial props). Defensive defaults in LiveFeed and EventTimeline.
- **Architecture**: Keep Prisma/server-only; keep relative fetch for client; ENV usage is fine. Add explicit error handling for non-OK API responses.
- **Lifecycle**: Force Start and auto-start are fine; UI already has empty-state copy. Ensure normalization is applied so empty arrays never become undefined.
