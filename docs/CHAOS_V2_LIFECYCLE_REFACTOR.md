# Chaos v2 Hybrid Tournament Lifecycle — Refactor Summary

## 1. Product Flow Summary

### Before (awkward flow)
1. League starts in `SETUP` — users build rosters.
2. Host must click **"Start Tournament"** — no automatic lock or live.
3. After host clicks Start, users often had to **click War Room again** to see live state (second-click bug).
4. No concept of LOCKED — picks locked only when going LIVE.

### After (hybrid model)
1. **SETUP**: Users join, save 2 Heroes / 2 Villains / 2 Cinderellas. After save → auto-redirect to dashboard (War Room).
2. **LOCKED**: When either (a) all required members have valid rosters, or (b) lock deadline is reached. Picks immutable.
3. **LIVE**: Automatically at configured live threshold (default: 60 min before first tip-off, Eastern Time). No host click for normal path.
4. **Host override**: "Force start now" remains — host can go LIVE early. On success → redirect so War Room shows live state immediately.
5. **First-load correctness**: War Room and dashboard show correct status and picks on first load.

---

## 2. Root Cause of Current Awkward Flow

1. **No redirect after host Start**  
   `startTournamentFromForm` returned `null` on success. The page stayed on PreDraftWarRoom. Server had already chosen PreDraftWarRoom vs DashboardClient at render time, so even when polling returned LIVE, the client kept showing the pre-draft layout.

2. **No conditional switch on status**  
   PreDraftWarRoom had no logic to render the live view when status became LIVE via polling.

3. **No revalidation**  
   `startTournament` did not call `revalidatePath`, so cached data could be stale.

---

## 3. Recommended Hybrid Lifecycle Design

### Status flow
```
SETUP → LOCKED (when all rosters complete OR lock deadline)
LOCKED → LIVE (at live threshold OR host override)
LIVE → COMPLETE (when champion determined)
```

### Sources of truth
- **lockDeadline** (optional on League): When set, league auto-locks at this time if still SETUP.
- **firstTipOff** (optional on League): First tournament tip-off. LIVE threshold = firstTipOff - 60 min.
- **Roster completion**: All members have 6 picks (2/2/2) and a championship tiebreaker (1–300).

### Tiebreaker (Chaos v2 refactor)
- Tiebreaker is collected on the portfolio (roster) page as part of the single submission flow.
- User cannot complete submission without a valid tiebreaker. No post-live modal.
- `allRostersComplete` requires both 2/2/2 picks and `championshipPrediction` for every member.

### Evaluation points
- `evaluateStatusTransitions(leagueId)` runs on war-room API load.
- Safe: only moves forward (SETUP→LOCKED, LOCKED→LIVE).
- When `lockDeadline` / `firstTipOff` are null, no auto-transitions; host override still works.

---

## 4. Exact Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `LOCKED` to enum; add `lockDeadline`, `firstTipOff` to League |
| `prisma/migrations/20260306120000_chaos_v2_lifecycle_hybrid/migration.sql` | Migration for enum + columns |
| `lib/league/lifecycle.ts` | **NEW** — `allRostersComplete`, `shouldLock`, `shouldGoLive`, `evaluateStatusTransitions` |
| `app/api/war-room/route.ts` | Call `evaluateStatusTransitions`; return `lockDeadline`, `firstTipOff` |
| `lib/actions/league.ts` | `startTournament`: allow SETUP/LOCKED, add redirect + revalidatePath |
| `app/league/[leagueId]/dashboard/_components/pre-draft-war-room.tsx` | Render DashboardClient when LIVE/COMPLETE; host "Force start now"; lifecycle banner |
| `app/league/[leagueId]/dashboard/page.tsx` | Treat LOCKED as pre-live (PreDraftWarRoom) |
| `app/league/[leagueId]/dashboard/_components/types.ts` | Add LOCKED, lockDeadline, firstTipOff |
| `app/league/[leagueId]/dashboard/_components/dashboard-client.tsx` | LOCKED status; CTA for LOCKED |
| `lib/actions/portfolio.ts` | Lock message copy |
| `app/league/[leagueId]/portfolio/_components/portfolio-builder.tsx` | (comment) isLocked for LOCKED |
| `lib/actions/league.ts` | Join blocked when LOCKED |
| `app/join/JoinClient.tsx` | LOCKED in joinClosed, LeagueStatus |
| `app/league/[leagueId]/lobby/page.tsx` | Show StartTournamentForm for LOCKED |
| `app/league/[leagueId]/standings/_components/my-league-client.tsx` | showPortfolio includes LOCKED |
| `app/api/dev/roster-actions/route.ts` | Lock from SETUP or LOCKED; Unlock from LOCKED or LIVE |
| `lib/league/draft-status.ts` | isDraftComplete = LIVE or COMPLETE |
| `app/league/[leagueId]/_components/dashboard.tsx` | Add LOCKED to status type |
| `app/dev/page.tsx` | Lock/Unlock for LOCKED; fix fetchSnapshot onClick |
| `docs/CHAOS_V2_LIFECYCLE_REFACTOR.md` | **NEW** — This document |

---

## 5. Verification Steps

### A. Save picks → auto redirect
1. Create league, join as member.
2. Go to portfolio, select 2/2/2, click Save roster.
3. **Expected**: Redirect to `/league/[id]/dashboard`, War Room shows picks on first load.

### B. All rosters complete → lock behavior
1. Set `lockDeadline` and `firstTipOff` on a league (via DB or future admin).
2. Autofill all rosters (dev panel).
3. Load war-room API or dashboard.
4. **Expected**: League moves SETUP → LOCKED (or LIVE if past live threshold).

### C. Timed live behavior
1. League in LOCKED, `firstTipOff` = now + 30 min.
2. Set `firstTipOff` = now - 1 min.
3. Load dashboard.
4. **Expected**: League moves LOCKED → LIVE.

### D. Host override
1. League in SETUP or LOCKED, all rosters complete.
2. Host clicks "Force start now".
3. **Expected**: Redirect to dashboard, DashboardClient (live War Room) shown, no second click.

### E. No second-click War Room bug
1. Host on PreDraftWarRoom, clicks Force start now.
2. **Expected**: Immediate redirect, live view on first load.
3. Non-host on PreDraftWarRoom when host forces start (or auto LIVE).
4. **Expected**: Within 4s poll, PreDraftWarRoom re-renders as DashboardClient with live data.

### F. Dev Control Center
1. Load managed league.
2. Autofill → Reset (SETUP only).
3. Lock picks (→ LIVE) from SETUP or LOCKED.
4. Unlock from LIVE → SETUP.
5. **Expected**: All flows work, replay unaffected.

### G. Bracket and roster selection
- Bracket rendering unchanged.
- Portfolio page still locks when status ≠ SETUP (LOCKED, LIVE, COMPLETE).
- Roster selection flow unchanged.

---

## 6. Applying the Migration

```bash
npx prisma migrate deploy
# or for dev:
npx prisma migrate dev --name chaos_v2_lifecycle_hybrid
```

Then:

```bash
npx prisma generate
```

---

## 7. Setting Timing (Optional)

For automatic lock and live transitions, set on League:

- `lockDeadline`: DateTime (Eastern) when picks lock.
- `firstTipOff`: DateTime (Eastern) of first tip-off.

When both are null, the league behaves as before: host must use "Force start now" to go LIVE after rosters are complete.
