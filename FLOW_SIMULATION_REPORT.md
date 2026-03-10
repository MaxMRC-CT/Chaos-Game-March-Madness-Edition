# Flow Simulation Report — Render Crash Risk Analysis

Simulated each flow by tracing code paths. **✓** = safe, **⚠** = potential risk, **✗** = crash risk.

---

## 1. Fresh League → 1 Member Only → No Picks

**Data:** `members=[1]`, `picks=[]`, `teams=[64]`, `games=[]`, `teamResults=[]`, `standings` (1 row, 0 pts), `score` maybe null.

| Component | Path | Result |
|-----------|------|--------|
| `getWarRoomData` | `normalizeStandings` with `!Array.isArray(rawTotals)` | ✓ Returns 1 row with 0s |
| | `buildMyLeagueAnalytics` | ✓ Skipped (`me && myPicks.length > 0` false) |
| | `rivalryPanel` | ✓ Skipped (`me && picks.length > 0` false) |
| | `buildHotSeatMatchups` | ✓ `fromGames=[]`, `pool=teams`, mocked pairs from seed order |
| | `standingsWithLeverage` | ✓ Maps 1 row, `memberPicksWithOwnership=[]`, chaosIndex=0 |
| | `top5LeveragePicks` | ✓ `picks=[]` → `getTopLeveragePicksLeagueWide` returns [] |
| | `upsetExposure` | ✓ `picks=[]`, `memberCount=1` → early return with zeros |
| | `roundSummary` | ✓ Skipped (`snapshots.length >= 2` false) |
| DashboardClient | `normalizeWarRoomPayload` | ✓ All arrays normalized |
| | Hot Seat | ✓ `games.length===0` → "Tournament hasn't started" |
| | MyTeam | ✓ `(myPicks ?? []).filter` → "No X picks yet" |
| | LeaderboardPanel | ✓ `safeStandings` = 1 row |
| | LiveFeed | ✓ `safeEvents=[]` → "No events yet" |
| PreDraftWarRoom | Same data | ✓ "Players in Lobby" shows 1, LiveFeed empty |
| Bracket | `hasTeams=true` | ✓ Renders region brackets with seed matchups (no results) |

**Verdict: ✓ Safe**

---

## 2. Fresh League → 4 Members → Some Picks Missing

**Data:** `members=[4]`, `picks` partial (e.g. 12 picks), `teams=[64]`, `standings` 4 rows.

| Component | Path | Result |
|-----------|------|--------|
| `buildMyLeagueAnalytics` | Per-member: only built when `me && myPicks.length > 0` | ✓ Members without picks get `undefined` |
| `rivalryPanel` | `picks.length > 0` true | ✓ Built |
| `standingsWithLeverage` | Member with no picks → `memberPicksWithOwnership=[]` | ✓ chaosIndex=0, portfolioLeverage=0 |
| MyLeagueClient | Portfolio tab: `data?.myLeagueAnalytics` | ✓ Shows "Build your roster" when no myLeagueAnalytics |
| Display | Standings table | ✓ Uses `displayStandings` (normalized) |

**Verdict: ✓ Safe**

---

## 3. Force LIVE Before Picks Complete

**Path:** Beta-admin `set-status` to LIVE (not "Force start now", which validates rosters).

**Data:** `status=LIVE`, `picks` partial or [], `games=[]`, `teamResults=[]`, `standings` from `normalizeStandings`.

| Component | Path | Result |
|-----------|------|--------|
| `evaluateStatusTransitions` | N/A (status already LIVE) | ✓ |
| `roundSummary` | `snapshots.length >= 2` | ✓ false → undefined |
| `hotSeatMatchups` | Same as scenario 1 | ✓ Mocked from teams |
| `buildRivalryPanel` | `picks.length > 0` | ✓ Skipped if picks=[] |
| Dashboard | Renders LIVE state | ✓ Same as 1, 2 |
| PreDraftWarRoom | `data.league.status === "LIVE"` | ✓ Switches to DashboardClient |

**Verdict: ✓ Safe** (after normalization fixes)

---

## 4. LIVE with Zero Results

**Data:** `games=[]`, `teamResults=[]`, `standings` (zeros or from `normalizeStandings`).

| Component | Path | Result |
|-----------|------|--------|
| `deriveCurrentRound` | `games.map` on [] | ✓ Returns "R64" |
| `buildHotSeatMatchups` | `fromGames=[]` | ✓ Uses pool from teams |
| Bracket `RegionRoundContent` | `getMatchupsForRound` R64, no games | ✓ `byGameNo=[]`, uses `buildSeedMatchups(teams)` |
| | `matchups.length === 0` | ✓ "Awaiting results" (only if no seed matchups) |
| | `buildSeedMatchups` | ✓ Returns pairs from NCAA_R64_MATCHUPS; needs `teams` |
| LeaderboardPanel | `safeStandings` | ✓ Renders rows with 0 pts |
| RoundSummaryCard | Only shown when `roundSummary` exists | ✓ Not rendered |

**Note:** If `teams=[]` (no teams for tournament year), `buildSeedMatchups` returns [] and `buildHotSeatMatchups` pool is []. No crash.

**Verdict: ✓ Safe**

---

## 5. LIVE After Only 1 R64 Result

**Data:** `games=[1]`, `teamResults=[2]`, one region has 1 completed game.

| Component | Path | Result |
|-----------|------|--------|
| `deriveCurrentRound` | `roundsPresent` has "R64" | ✓ Returns "R64" |
| Bracket `getMatchupsForRound` | Region with game: `byGameNo` has 1 pair | ✓ Renders 1 matchup |
| | Region without game: `byGameNo=[]` | ✓ Uses seeded pairs |
| `standings` | From `score.totals` | ✓ May be recomputed or zeros |
| `highlightEvents` | May include TEAM_ELIMINATED | ✓ Array, possibly empty |
| `movementReasonChip` | `events ?? []` | ✓ Safe iteration |

**Verdict: ✓ Safe**

---

## 6. COMPLETE with No Championship Total Entered

**Data:** `status=COMPLETE`, `championshipPrediction: null` for some members.

| Component | Path | Result |
|-----------|------|--------|
| `normalizeStandings` | Merges `championshipPrediction` from members | ✓ null preserved |
| Display | `row.championshipPrediction != null ? row.championshipPrediction : "—"` | ✓ Shows "—" |
| LeaderboardPanel | Same | ✓ TB: — |
| MyLeagueClient standings table | Same | ✓ |

**Verdict: ✓ Safe**

---

## 7. League with 0 Portfolio Picks

**Data:** `picks=[]`, `myPicks=[]`, `ownershipMap={}`, `ownershipByRole={}`.

| Component | Path | Result |
|-----------|------|--------|
| `buildMyLeagueAnalytics` | `myPicks.length > 0` false | ✓ undefined |
| `rivalryPanel` | `picks.length > 0` false | ✓ undefined |
| `buildHotSeatMatchups` | `ownedTeams=[]`, `pool=teams` | ✓ Mocked from all teams |
| `top5LeveragePicks` | `picksWithOwnershipForTop5=[]` | ✓ Returns [] |
| `standingsWithLeverage` | Each row: `memberPicks=[]` | ✓ chaosIndex=0 |
| `computeUpsetExposure` | `picks=[]`, `picks.filter(...).length` | ✓ `Math.max(1, 0)=1`, 0/1=0 |
| MyTeam | `(myPicks ?? []).filter` | ✓ "No X picks yet" |
| Portfolio page | `regions` from teams | ✓ If teams exist, regions populated |
| MyLeaguePortfolioPanel | Only when `myLeagueAnalytics` | ✓ Not rendered (no myLeagueAnalytics) |

**Verdict: ✓ Safe**

---

## 8. League with No Rivalry Data

**Data:** `rivalryPanel=undefined`, `highlightEvents` has no RIVALRY_BONUS.

| Component | Path | Result |
|-----------|------|--------|
| `rivalryMoments` | `(data.highlightEvents ?? []).filter(type===RIVALRY_BONUS)` | ✓ [] |
| RivalriesView | `moments = rivalryMoments ?? []` | ✓ [] |
| | `insights = panel ? [...] : []` | ✓ [] |
| | `moments.length === 0` | ✓ "No rivalry swings yet" |
| | `topSwings = moments.slice(0,3).map(...)` | ✓ [] |

**Verdict: ✓ Safe**

---

## 9. League with No Score Snapshots

**Data:** `snapshots=[]` (table missing or empty).

| Component | Path | Result |
|-----------|------|--------|
| `computeStandingsDelta` | `snapshots.length < 2` | ✓ Returns delta all 0 |
| `roundSummary` | `snapshots.length >= 2` false | ✓ undefined |
| `buildMomentumSummaries` | `standings`, `snapshots=[]`, `highlightEvents`, `ownershipMap` | ✓ |
| | `computeBiggestJump(standings, [])` | ✓ `snapshots.length < 2` → null |
| | `getMomentumLeader(standings)` | ✓ `standings.length === 0` → null else first |
| | `isLeaderUnderPressure` | ✓ `standings.length < 2` → false |
| | `computeChaosSpike(null, ...)` | ✓ null |
| momentumSummaries | Returned with nulls | ✓ All consumers guard |
| Display | `data.momentumSummaries?.biggestJump` | ✓ Optional chaining |

**Verdict: ✓ Safe**

---

## Additional Edge Cases Checked

| Scenario | Result |
|----------|--------|
| `teams=[]` (no teams for tournament year) | ✓ `buildHotSeatMatchups` pool=[], no pairs; Bracket shows "No teams loaded" |
| `members=[]` | ✓ `normalizeStandings` returns []; `standingsWithLeverage` maps []; Leaderboard empty |
| `standings=[]` in LeaderboardPanel | ✓ `safeStandings` = []; "Waiting for results" |
| Portfolio `regions=[]` (teams=[]) | ✓ `regions.map` renders nothing, no crash |
| MyLeaguePortfolioPanel `myPicks` | ✓ Only rendered when myLeagueAnalytics exists (myPicks had length>0); `[...myPicks]` safe |
| `buildRivalryPanel` with `standings=[]` | ✓ `findIndex` returns -1, `-1+1=0`, `0 \|\| standings.length+1` = 1 (falsy 0) |

---

## Remaining Low-Risk Considerations

1. **`lib/analytics/rivalry.ts:246`** — `standings.findIndex(...) + 1 || standings.length + 1`  
   When `findIndex` is -1, we get `0 || standings.length + 1`. If `standings` were undefined this would throw, but `buildRivalryPanel` is only called from `get-data` which passes `standings` from `normalizeStandings` (always array). **✓ Safe**.

2. **`lib/war-room/get-data.ts`** — `picks.map`, `teams.map`, `members`  
   All come from Prisma; always arrays. **✓ Safe**.

3. **`data.upsetExposure`** — Always returned by `computeUpsetExposure` (includes memberCount<=0 early return). **✓ Safe**.

---

## Summary

| Flow | Verdict |
|------|---------|
| 1. Fresh league, 1 member, no picks | ✓ Safe |
| 2. Fresh league, 4 members, partial picks | ✓ Safe |
| 3. Force LIVE before picks complete | ✓ Safe |
| 4. LIVE with zero results | ✓ Safe |
| 5. LIVE after 1 R64 result | ✓ Safe |
| 6. COMPLETE, no championship total | ✓ Safe |
| 7. League with 0 portfolio picks | ✓ Safe |
| 8. League with no rivalry data | ✓ Safe |
| 9. League with no score snapshots | ✓ Safe |

**All 9 flows are safe after the normalization and defensive guard fixes.**
