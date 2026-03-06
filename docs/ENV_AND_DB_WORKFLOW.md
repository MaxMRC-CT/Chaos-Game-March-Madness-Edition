# Environment & Database Workflow

This guide explains how to switch between development and production databases safely.

## Which File Is Used for What

| Environment | Env File | Use Case |
|-------------|----------|----------|
| **Development** | `.env.development` | Local dev, migrations, seeding, resetting DB |
| **Production** | `.env.production` | Deploying migrations to live Neon DB |

> **Note:** The root `.env` is no longer used by Prisma scripts. All Prisma commands use `dotenv-cli` to load the correct file.

---

## Commands You Need

### A) Daily Development Work

When working locally:

1. **Generate Prisma Client** (after pulling schema changes or first time):
   ```bash
   npm run prisma:dev:generate
   ```

2. **Create a new migration** (when you changed `schema.prisma`):
   ```bash
   npm run prisma:dev:migrate
   ```

3. **Check migration status**:
   ```bash
   npm run prisma:dev:status
   ```

4. **Run the Next.js dev server**:
   ```bash
   npm run dev
   ```
   (Make sure your app uses `.env.development` or `DATABASE_URL` from env when in dev.)

---

### B) Reset Dev DB and Reseed

When you want a clean dev database with fresh seed data:

```bash
npm run db:dev:reset
```

This will:
- Drop all tables in the **development** database
- Re-run all migrations
- Run the seed script (`prisma/seed.ts`)

---

### C) Deploy Prod Migrations Safely

When you're ready to apply migrations to production:

1. **Check prod migration status** (optional but recommended):
   ```bash
   npm run prisma:prod:status
   ```

2. **Deploy migrations**:
   ```bash
   npm run db:prod:deploy
   ```

This uses `migrate deploy` — it only applies pending migrations. It does **not** reset or drop any data.

---

## ⚠️ IMPORTANT SAFETY WARNING

# **NEVER RUN RESET ON PRODUCTION**

- `prisma migrate reset` **DROPS ALL DATA** in the database.
- There is **no** `db:prod:reset` script on purpose.
- **Only ever run `db:dev:reset`** — and only when you are sure you're using `.env.development` (which points to your dev Neon DB).
- Production scripts use **`migrate deploy`** only — never `migrate dev` or `migrate reset`.

Before running any prod command, double-check that your `.env.production` `DATABASE_URL` points to the correct production Neon database.

---

## Quick Reference

| Task | Command |
|------|---------|
| Dev: check status | `npm run prisma:dev:status` |
| Dev: generate client | `npm run prisma:dev:generate` |
| Dev: create migration | `npm run prisma:dev:migrate` |
| Dev: reset + reseed | `npm run db:dev:reset` |
| Prod: check status | `npm run prisma:prod:status` |
| Prod: deploy migrations | `npm run db:prod:deploy` |
