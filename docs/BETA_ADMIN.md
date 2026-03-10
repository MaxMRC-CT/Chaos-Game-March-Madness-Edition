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

## Environment Variable

```bash
BETA_ADMIN_KEY=<your-secret-key>
```

Set in Vercel (or `.env.production`):

1. Vercel Dashboard → Project → Settings → Environment Variables
2. Add `BETA_ADMIN_KEY` with a strong random value
3. Redeploy if needed

## Flow

1. Visit `/beta-admin`
2. Enter `BETA_ADMIN_KEY` and sign in
3. Enter a 6-digit Game PIN and click **Load**
4. League info, round controls, and standings appear
5. Use **Apply Round**, **Apply Next**, or **Reset Results** to simulate progress

## What It Supports

| Action              | Description                          |
|---------------------|--------------------------------------|
| Load league by PIN  | Load any league created normally     |
| League metadata     | Name, PIN, status, member count      |
| Roster completion   | How many members have complete picks |
| Round counts        | R64/R32/…/NCG progress               |
| Apply round         | Apply a specific round (R64–NCG)     |
| Apply next          | Apply the next incomplete round      |
| Reset results       | Clear all results for loaded league  |
| Standings snapshot  | Current standings and recent events  |

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
| `/api/beta-admin/apply-round` | POST   | Apply round / reset         |

## Verification (Vercel)

1. Deploy with `BETA_ADMIN_KEY` set
2. Visit `https://your-app.vercel.app/beta-admin`
3. Enter the key and sign in
4. Create a league via the normal flow (or use an existing one)
5. Load by PIN and apply rounds
6. Confirm standings update in the app
