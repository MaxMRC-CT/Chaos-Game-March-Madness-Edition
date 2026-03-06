# Dev Control Center — Workflow Redesign

## Root workflow redesign summary

The Dev Control Center replaces the previous scattered dev/test workflow with a single, opinionated UI-driven flow centered on one **managed test league** for Chaos v2 portfolio testing.

**Before (pain points):**
- Reset, live, and pre-draft flows were separate and confusing
- New leagues could end up in wrong states (DRAFT vs SETUP)
- 2025 replay leagues were not clearly separated from normal leagues
- Reconnect codes required terminal output hunting
- Testing needed many terminal commands (seed, import rounds, etc.)
- Creating a league, opening sessions, building rosters, and applying results required manual steps across tools

**After (Dev Control Center):**
- One canonical “managed test league” created and controlled from the UI
- Create → Load by PIN → Rosters → Results in a linear flow
- Direct login links for each test user (no reconnect-code hunting)
- Results applied from `data/2025/results.json` with one click (no CLI)
- Roster autofill, lock/unlock, and snapshot status all in one place

---

## Backend flow design

### 1. Test League Factory

- **Endpoint:** `POST /api/dev/test-league-factory`
- **Body:** `{ numUsers?: 1–4, pin?: string, resetExisting?: boolean }`
- **Flow:**
  1. Ensure 2025 `TournamentYear` + teams exist (error if teams < 12)
  2. If `resetExisting` and league with `pin` exists → delete it
  3. Create league: 2025, status `SETUP`, name "Dev 2025 Test League (Chaos v2)"
  4. Create 1–4 members (Host, Kara, Alex, Jordan) with unique reconnect codes
  5. Return `leagueId`, `pin`, `members` with `loginUrl` per member
- **Login URL:** `{origin}/api/dev/dev-login?leagueId=X&memberId=Y`

### 2. Managed League + Session Links

- **Endpoint:** `GET /api/dev/managed-league?leagueId=X` or `?code=123456`
- **Returns:** league metadata (id, code, status, year), members with reconnect codes and `loginUrl`, roster status per member
- **Dev Login:** `GET /api/dev/dev-login?leagueId=X&memberId=Y` sets `cl_member_{leagueId}` cookie and redirects to `/league/X/dashboard`

### 3. Roster Actions

- **Endpoint:** `POST /api/dev/roster-actions`
- **Body:** `{ leagueId or code, action: "autofill" | "reset" | "lock" | "unlock" }`
- **Actions:**
  - `autofill`: Fill 2/2/2 (H/V/C) for members with incomplete rosters (Chaos v2 rules)
  - `reset`: Clear all `PortfolioPick` for the league (requires SETUP)
  - `lock`: Set league to LIVE (after validating all members have 6 picks)
  - `unlock`: Set league back to SETUP (dev only)

### 4. Results Simulator

- **Endpoint:** `POST /api/dev/apply-round-replay`
- **Body:** `{ leagueId or code, round?: "R64"|...|"NCG", action?: "apply"|"apply_next"|"replay_full"|"reset" }`
- **Data source:** `data/2025/results.json` (same structure as existing replay)
- **Actions:**
  - `apply` + round: Apply a specific round
  - `apply_next`: Apply the next incomplete round
  - `replay_full`: Apply R64 → R32 → S16 → E8 → F4 → NCG in order
  - `reset`: Clear all games, team results, scores; set league to LIVE
- Uses `applyRoundGames` and `computeLeagueStandings` (existing scoring pipeline)

### 5. League Snapshot

- **Endpoint:** `GET /api/dev/league-snapshot?leagueId=X` or `?code=123456`
- **Returns:** round counts, standings, top score deltas, recent events, status
- Used for “League Snapshot” section in the UI

---

## UI design structure

1. **Dev Key** — Single input; all requests send `x-dev-key`
2. **Test League Factory** — Num users (1–4), optional PIN, reset-existing toggle, “Create Fresh 2025 Test League”
3. **Test Session Links** — League info + table (nickname, reconnect code, copy, open)
4. **Roster Status** — Table (H/V/C counts), Autofill, Reset, Lock/Unlock
5. **Results Simulator** — Round dropdown, Apply Round, Apply Next, Replay Full, Reset Results
6. **League Snapshot** — Round badges, standings, top deltas, recent events
7. **Raw Actions (collapsed)** — Link to Legacy Dev Panel (`/dev/legacy`)

---

## Exact files changed

| File | Change |
|------|--------|
| `app/dev/page.tsx` | Replaced with Dev Control Center UI |
| `app/dev/legacy/page.tsx` | **New** — Legacy dev panel (old UI) |
| `lib/dev/validate-dev.ts` | **New** — Shared `validateDevPanel` |
| `app/api/dev/test-league-factory/route.ts` | **New** — Create 2025 test league |
| `app/api/dev/managed-league/route.ts` | **New** — GET managed league + roster status |
| `app/api/dev/dev-login/route.ts` | **New** — GET, set cookie, redirect |
| `app/api/dev/roster-actions/route.ts` | **New** — Autofill, reset, lock, unlock |
| `app/api/dev/apply-round-replay/route.ts` | **New** — Apply rounds from `data/2025/results.json` |
| `app/api/dev/league-snapshot/route.ts` | **New** — GET league snapshot |
| `app/page.tsx` | Link text: "Dev Panel" → "Dev Control Center" |
| `docs/DEV_CONTROL_CENTER.md` | **New** — This document |

**Unchanged (used by Dev Control Center or Legacy):**
- `app/api/dev/progress/route.ts`
- `app/api/dev/round-health/route.ts`
- `app/api/dev/round-counts/route.ts`
- `app/api/dev/apply-results/route.ts` (legacy, manual winners)
- `app/api/dev/simulate/route.ts` (legacy)
- `app/api/dev/reset-pre-draft/route.ts`
- `app/api/dev/reset-live/route.ts`
- `app/api/dev/wipe-db/route.ts`
- `app/api/dev/set-championship-total/route.ts`
- `app/api/dev/replay/route.ts`

---

## Verification steps

1. **Environment**
   - `ENV_NAME=development` in `.env.development`
   - `DEV_PANEL_KEY` set
   - `npm run seed:all` run once (2025 teams)

2. **Create test league**
   - Open `/dev`
   - Enter dev key
   - Click “Create Fresh 2025 Test League”
   - Confirm league info and member table appear

3. **Test session links**
   - Click “Open” for a member → new tab logs in as that member
   - Confirm dashboard loads correctly

4. **Roster flow**
   - Click “Autofill” → all members show 2/2/2
   - Click “Lock picks” → league status becomes LIVE
   - Click “Unlock picks” → league returns to SETUP

5. **Results**
   - Ensure `data/2025/results.json` has R64/R32/etc arrays
   - Click “Apply Round” (e.g. R64) → round counts update
   - Click “Apply Next” → next round applied
   - Click “Replay Full” → all rounds applied
   - Click “Reset Results” → games cleared, league LIVE

6. **League Snapshot**
   - After applying rounds, confirm standings and deltas update
   - Confirm recent events list

7. **Legacy**
   - Open `/dev/legacy` → old dev panel still works
