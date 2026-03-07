# Chaos v2.2 Phase 1 — Product Summary

## Overview

Phase 1 implements strategic depth and product feel across three pillars:
- **1A** True leverage analytics
- **1B** Portfolio personality metrics
- **1C** Momentum / chaos event amplification

All changes are analytics/presentation only. No scoring modifiers or gameplay changes.

---

## What Already Existed (v2.1)

- `lib/league/ownership.ts`: `computeOwnershipByRole` → heroPct, villainPct, cinderellaPct per team
- `app/api/war-room/route.ts`: `buildMyLeagueAnalytics`
  - mostUniquePick, chalkiestPick, biggestVillainHit, bestCinderellaPerformer
  - scoreByRole (hero, villain, cinderella, total)
  - picksWithOwnership for my picks
- `standingsDelta` from LeagueScoreSnapshot
- Event types: DRAFT_PICK_MADE, TEAM_ELIMINATED, RIVALRY_BONUS, SCORE_RECALCULATED
- EventTimeline, LiveFeed with formatEventStory
- LeaderboardPanel with movementReasonChip for top movers

---

## What Is Newly Added (v2.2 Phase 1)

### Phase 1A — Leverage Analytics

| Metric | Description |
|--------|-------------|
| **Pick leverage score** | `points × max(0.05, 1 - ownershipPct/100)^1.2` |
| **Portfolio leverage score** | Average of pick leverage across user's 6 picks |
| **Highest leverage hit** | Pick with max leverage (low-owned + high points) |
| **Most valuable contrarian hit** | Best low-owned (<50%) pick by points |

### Phase 1B — Portfolio Personality Metrics

| Metric | Formula / Heuristic |
|--------|---------------------|
| **Chalk Index** (0–100) | Average ownership of selected picks |
| **Leverage Index** (0–100) | Portfolio leverage normalized by typical max (~40) |
| **Volatility Index** (0–100) | Seed spread, villain/cinderella concentration, ownership spread |
| **Villain Aggression Score** (0–100) | Avg villain leverage normalized |
| **Cinderella Risk Score** (0–100) | Seed boldness + inverse ownership for Cinderella picks |

### Phase 1C — Momentum / Chaos Amplification

| Concept | Definition |
|---------|------------|
| **Biggest Jump** | Member with largest positive rank improvement vs previous snapshot |
| **Chaos Spike** | Biggest jumper who had villain hit or rivalry gain in recent highlights |
| **Leader Under Pressure** | #1 lead over #2 < 15 pts |
| **Chalk Collapse** | TEAM_ELIMINATED where team was high-owned (≥50%) as Hero |
| **Villain Shockwave** | TEAM_ELIMINATED with low villain ownership (<30%) or RIVALRY VILLAIN_OVER_HERO |
| **Cinderella Surge** | RIVALRY_BONUS with CINDERELLA_OVER_HERO |

---

## Files Changed

| File | Changes |
|------|---------|
| `lib/analytics/leverage.ts` | **NEW** — Pick/portfolio leverage, highest hit, contrarian hit |
| `lib/analytics/personality.ts` | **NEW** — Chalk, leverage, volatility, villain, cinderella indices |
| `lib/analytics/momentum.ts` | **NEW** — Biggest jump, chaos spike, leader pressure, event labels |
| `lib/analytics/event-format.ts` | **NEW** — Shared formatEventStory + momentum labels |
| `app/api/war-room/route.ts` | Imports analytics; extends buildMyLeagueAnalytics; adds momentumSummaries |
| `app/league/.../types.ts` | Extends myLeagueAnalytics, adds momentumSummaries |
| `app/league/.../my-league-portfolio-panel.tsx` | Leverage section + Portfolio Personality section |
| `app/league/.../event-timeline.tsx` | Uses shared formatEventStory; accepts ownershipByRole |
| `app/league/.../live-feed.tsx` | Uses shared formatEventStory; accepts ownershipByRole |
| `app/league/.../my-league-client.tsx` | Passes ownershipByRole to EventTimeline; momentum strip above feed; momentumSummaries to LeaderboardPanel |
| `app/league/.../leaderboard-panel.tsx` | Accepts momentumSummaries; movementReasonChip uses Chaos Spike / +N spots |
| `app/league/.../dashboard-client.tsx` | Passes ownershipByRole to LiveFeed; momentumSummaries to LeaderboardPanel |
| `app/league/.../pre-draft-war-room.tsx` | Passes ownershipByRole to LiveFeed |

---

## Verification Steps

### Leverage analytics

1. Go to My League → Portfolio tab with picks and results.
2. Confirm **Leverage** section shows: Portfolio Leverage, Big Leverage Hit, Contrarian Win (when applicable).
3. Low-owned villain hit should appear as Big Leverage Hit; low-owned Cinderella run as high leverage.

### Portfolio personality metrics

1. On Portfolio tab, confirm **Portfolio Personality** section with 5 indices: Chalk, Leverage, Volatility, Villain, Cinder.
2. Chalky roster → higher Chalk Index; contrarian picks → higher Leverage Index.
3. High villain leverage → higher Villain Aggression Score.

### Momentum / chaos feed updates

1. My League → Feed tab: confirm **momentum strip** (Chaos Spike, Biggest Jump, Leader Under Pressure) when data exists.
2. Event items: TEAM_ELIMINATED with high hero ownership → "Chalk Collapse: ..."; low villain ownership villain hit → "Villain Shockwave: ...".
3. RIVALRY CINDERELLA_OVER_HERO → "Cinderella Surge: ..."; VILLAIN_OVER_HERO → "Villain Shockwave: ...".
4. Power tab: top mover with chaos spike shows "Chaos Spike"; biggest jumper shows "+N spots".

### Regression

- Standings table unchanged.
- Replay / dev control center unchanged.
- Base scoring engine unchanged.
- v2.0/v2.1 gameplay and flow preserved.
