# Chaos League v2.0 — Implementation Summary

## 1. Architectural summary

- **Draft removed**: No snake draft; no draft room, no turn order, no exclusive team ownership.
- **Portfolio (roster) model**: Each member builds a roster of 6 picks: 2 Heroes, 2 Villains, 2 Cinderellas. All teams are available to all players. Picks lock when the tournament starts (league status → LIVE).
- **Scoring**: Role-based only; uses `PortfolioPick` and v2 formulas (hero: 1/2/4/8/16/32 per win; villain: points on elimination; cinderella: win points + milestones). Rivalry bonuses apply per (winner-owner, loser-owner) pair so multiple owners per team are supported.
- **Bracket**: Unchanged structurally; bracket view and hot-seat now show multiple owners per team (e.g. "H: Alice, Bob").
- **Backward compatibility**: v1.2 migrations remain in git history. `DraftPick` and `DRAFT` status remain in the schema for now; new flows use `PortfolioPick` and SETUP → LIVE.

---

## 2. Schema changes

**Added**

- **`RoleType`** enum: `HERO` | `VILLAIN` | `CINDERELLA` (same values as `DraftRole`).
- **`PortfolioPick`** model:
  - `id`, `leagueId`, `memberId`, `teamId`, `role` (RoleType), `createdAt`
  - `@@unique([leagueId, memberId, teamId])` — same team cannot appear twice for same member.
  - Relations: `League`, `LeagueMember`, `Team`.

**Unchanged (for now)**

- `DraftPick`, `DraftRole`, `LeagueStatus` (including `DRAFT`), `League.currentPick`, `LeagueMember.draftPosition` — left in place to avoid a large migration; can be removed in a later cleanup.

**Constraints (enforced in app)**

- Per member: exactly 2 HERO, 2 VILLAIN, 2 CINDERELLA.
- CINDERELLA: team seed ≥ 10 (validated in `lib/actions/portfolio.ts`).

---

## 3. File changes

| Area | Change |
|------|--------|
| **Prisma** | `prisma/schema.prisma`: added `RoleType`, `PortfolioPick`; `League`, `LeagueMember`, `Team` get `portfolioPicks` relation. |
| **Migration** | `prisma/migrations/20260306000000_add_portfolio_pick/migration.sql`: creates `RoleType` enum and `PortfolioPick` table. |
| **Portfolio** | `lib/actions/portfolio.ts`: `savePortfolioPicks`, validation (2/2/2, CINDERELLA seed ≥ 10), lock when not SETUP. |
| **Portfolio UI** | `app/league/[leagueId]/portfolio/page.tsx`: server page; loads league, teams by region, member’s picks. |
| **Portfolio UI** | `app/league/[leagueId]/portfolio/_components/portfolio-builder.tsx`: client builder (2/2/2 counters, role buttons, validation, save). |
| **Scoring** | `lib/scoring/compute.ts`: reads `portfolioPick`; hero = `2^wins - 1`; cinderella = win points + milestones; rivalry over all (winner, loser) owner pairs. |
| **War-room** | `app/api/war-room/route.ts`: uses `portfolioPick`; `ownershipMap` → `Record<string, Ownership[]>`; hot-seat and deltas support multiple owners. |
| **Types** | `app/league/.../types.ts`: `ownershipMap` value type → array. |
| **Ownership** | `lib/league/ownership.ts`: `buildTeamOwnershipMap` returns `Record<string, TeamOwner[]>`. |
| **Standings / feed** | `my-league-client.tsx`, `leaderboard-panel.tsx`, `live-feed.tsx`: work with portfolio/war-room data; leaderboard villain check uses `.some()` on owners. |
| **Bracket** | `bracket-client.tsx`: `TeamRow` and `matchesOwnershipFilter` accept `TeamOwner[]` per team; display multiple owners. |
| **Dashboard** | `my-team.tsx`: shows 2 picks per role (6 cards); totals per role. |
| **League actions** | `lib/actions/league.ts`: `startTournament`, `startTournamentFromForm` (SETUP → LIVE; all members must have 6 portfolio picks); removed DRAFT redirect. |
| **Pre-draft** | `pre-draft-war-room.tsx`: “Build roster” → portfolio; “Start tournament” replaces “Start draft”. |
| **Dashboard CTA** | `dashboard-client.tsx`: SETUP/DRAFT → “Build roster” (portfolio). |
| **Standings** | `my-league-client.tsx`: “Roster” link when SETUP/DRAFT. |
| **Nav** | `LeagueSidebarNav.tsx`: added “Roster” (portfolio). |
| **Lobby** | `app/league/.../lobby/page.tsx`: draft order/pick history removed; “Build roster”, “Start tournament” (admin). `StartTournamentForm` in `start-tournament-form.tsx`. |
| **Draft** | `app/league/.../draft/page.tsx`: redirects to `/league/[leagueId]/portfolio`. Removed: `draft-room.tsx`, `draft-order.tsx`, `pick-history.tsx`, `pick-modal.tsx`. |
| **API** | `app/api/draft-state/route.ts`: removed. |
| **Dev** | `app/api/dev/reset-pre-draft/route.ts`: also deletes `portfolioPick`. `scripts/dev-reset-portfolio.ts`: clears portfolio and sets league to SETUP. |
| **Stub components** | `components/bracket/FinalsBracket.tsx`, `RegionBracket.tsx`, `GameCard.tsx`, `utils.ts`: minimal exports so build passes (pre-existing empty files). |

---

## 4. Migration steps

1. **Apply Prisma migration**
   ```bash
   npx prisma migrate deploy
   ```
   Or for dev:
   ```bash
   npx prisma migrate dev --name add_portfolio_pick
   ```

2. **Optional: backfill from v1**
   - Not implemented. To migrate existing `DraftPick` data into `PortfolioPick`, run a one-off script that maps each `DraftPick` (leagueId, memberId, teamId, role) to a `PortfolioPick` (same fields; role as `RoleType`). v2 expects 2/2/2 per member; v1 had 1/1/1, so backfill would only partially populate rosters.

3. **Dev reset**
   - Full reset (league + members): use existing dev panel “reset pre-draft” (now also clears `portfolioPick`).
   - Portfolio-only: `npx tsx scripts/dev-reset-portfolio.ts <6-digit-code>`.

---

## 5. Implementation order (already done)

1. Schema + migration (PortfolioPick, RoleType).
2. Portfolio actions + portfolio page + portfolio builder UI.
3. Scoring engine v2 (formulas + `portfolioPick` + multi-owner rivalry).
4. War-room, standings, feed, bracket, dashboard (ownership array, my-team 2/2/2).
5. Remove draft flow: start tournament, lobby, pre-draft, draft redirect; delete draft-state API and draft room components; add Roster nav and dev reset.

---

## 6. Minimal safe rollout plan

- **Deploy**: Run migration (adds only new table/enum). Existing leagues keep `DraftPick` and `DRAFT`; they will show 0 portfolio picks until members use the new Roster page.
- **New leagues**: Create league → SETUP → members open “Roster”, build 2/2/2 → host “Start tournament” → LIVE; scoring uses `PortfolioPick` only.
- **Old leagues (v1)**:
  - Either leave as-is (they may have 0 standings if scoring now reads only `portfolioPick`), or
  - Run a one-time backfill from `DraftPick` to `PortfolioPick` (1 pick per role per member) and optionally set status to LIVE so existing results still score.
- **Feature flag**: Not added; v2 is the default behavior. To hide portfolio and keep draft temporarily, feature-flag the “Roster” nav and “Start tournament,” and keep draft page/components behind the flag (revert draft page redirect and restore draft-state API from git if needed).

---

## Self-check (done)

- Draft-only UI removed (draft room components deleted; draft page redirects).
- No broken imports; build succeeds.
- No draft routes in use (draft-state API removed).
- Portfolio page: 2/2/2 selection, validation, lock when LIVE.
- Scoring uses `portfolioPick` and v2 formulas; rivalry supports multiple owners.
- Bracket rendering unchanged in structure; shows multiple owners per team.
- App builds: `npm run build` succeeds.
