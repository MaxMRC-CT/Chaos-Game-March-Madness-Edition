# Beta Admin Panel

A production-safe admin panel for simulating tournament rounds in the deployed beta environment.

## Purpose

- Allow the app owner to apply rounds (R64 → FINAL) in the deployed beta
- Verify deployed behavior without exposing the full `/dev` panel
- No pre-seeded users or test leagues — works against real leagues created via the normal flow

## Access

- **Route:** `/beta-admin`
- **Auth:** `BETA_ADMIN_KEY` environment variable
- **Production:** Allowed. Unlike `/dev`, beta-admin works in production with valid key

## Environment Variables

```bash
BETA_ADMIN_KEY=<your-secret-key>

# Optional: when true, newly created leagues default to 2025 (for replay compatibility)
BETA_SIM_MODE=true

# Optional: when true, users can join leagues even after LOCKED/LIVE (for 2025 test data). Remove for 2026 production.
NEXT_PUBLIC_ALLOW_BETA_JOIN_AFTER_START=true
```

**BETA_ADMIN_KEY** (required for beta-admin):

1. Vercel Dashboard → Project → Settings → Environment Variables
2. Add `BETA_ADMIN_KEY` with a strong random value
3. (Optional) Add `BETA_SIM_MODE=true` so new leagues default to 2025 for replay
4. Redeploy if needed

## Flow

1. Visit `/beta-admin`
2. Enter `BETA_ADMIN_KEY` and sign in
3. Enter a 6-digit Game PIN and click **Load**
4. League info, round controls, and standings appear
5. Use **Apply Round**, **Apply Next**, or **Reset Results** to simulate progress

## What It Supports

| Action              | Description                                          |
|---------------------|------------------------------------------------------|
| Load league by PIN  | Load any league created normally                     |
| League metadata     | Name, PIN, status, member count                      |
| League state        | Force Setup / Locked / Live / Complete (beta admin)  |
| Roster completion   | How many members have complete picks                 |
| Round counts        | R64/R32/…/NCG progress                               |
| Apply round         | Apply a specific round (R64–NCG)                     |
| Apply next          | Apply the next incomplete round                      |
| Reset results       | Clear all results for loaded league                  |
| Standings snapshot  | Current standings and recent events                  |

## What It Does NOT Expose

- Wipe DB
- Seed test leagues or fake users
- Replay full across all leagues
- Dev-login / impersonate members
- Raw dev panel actions

## Security

- Uses a separate secret (`BETA_ADMIN_KEY`) from `DEV_PANEL_KEY`
- Session stored in HTTP-only cookie (SHA256 hash of key)
- All API routes validate cookie or `x-beta-admin-key` header
- `/dev` remains blocked in production via `ENV_NAME !== "development"`

## API Routes

| Route                         | Method | Purpose                     |
|-------------------------------|--------|-----------------------------|
| `/api/beta-admin/auth`        | POST   | Verify key, set cookie      |
| `/api/beta-admin/logout`      | POST   | Clear cookie                |
| `/api/beta-admin/check`       | GET    | Verify session              |
| `/api/beta-admin/league`      | GET    | Load league by PIN          |
| `/api/beta-admin/snapshot`    | GET    | Round counts, standings     |
| `/api/beta-admin/set-status`  | POST   | Force league status (admin) |
| `/api/beta-admin/apply-round` | POST   | Apply round / reset         |

## Verification (Vercel)

1. Deploy with `BETA_ADMIN_KEY` set (and optionally `BETA_SIM_MODE=true`)
2. Visit `https://your-app.vercel.app/beta-admin`
3. Enter the key and sign in
4. Create a league via the normal flow (or use an existing one)
5. Load by PIN — use **League State Controls** to force Setup/Locked/Live as needed
6. Apply rounds and confirm standings update in the app

## Revert After Beta

To remove beta sim enhancements:

1. **BETA_SIM_MODE:** Remove `BETA_SIM_MODE` from env (or set to `false`). In `lib/actions/league.ts`, remove the override and restore hardcoded `2026` if desired.
2. **NEXT_PUBLIC_ALLOW_BETA_JOIN_AFTER_START:** Remove this env var (or set to `false`) for 2026 production so joining locks correctly after tournament start.
3. **League State Controls:** Delete `app/api/beta-admin/set-status/route.ts`; remove the "League State Controls" section and `callSetStatus` from `app/beta-admin/page.tsx`.
4. Remove the corresponding rows from this doc.
