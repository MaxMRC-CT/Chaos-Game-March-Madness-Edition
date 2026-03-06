# 2025 NCAA Replay – Testing Checklist

Use these commands in order to set up and test the 2025 replay in your dev database.

## Prerequisites

- `.env.development` configured with `DATABASE_URL` pointing at your dev database
- `dotenv-cli` and `tsx` installed (they are in `package.json`)

## Commands (in order)

### 1. Wipe dev DB

```bash
npm run db:dev:reset
```

### 2. Migrate

Migration runs as part of `db:dev:reset`. If you need to run it separately:

```bash
npm run prisma:dev:migrate
```

### 3. Seed all teams (2025 + 2026)

```bash
npm run seed:all
```

### 4. Seed the dev 2025 replay league

```bash
npm run seed:dev2025
```

This prints the PIN (e.g. `123456`) and `leagueId`. Save the reconnect codes for Host, Kara, Player3, Player4 if you want to reconnect.

### 5. Start the app

```bash
npm run dev
```

### 6. Join via /join

1. Open `http://localhost:3000/join`
2. Enter the PIN (e.g. `123456`)
3. Because the league is LIVE, joining is closed. Use **Reconnect**:
   - Enter PIN
   - Enter nickname (Host, Kara, Player3, or Player4)
   - Enter reconnect code (from step 4 output)
4. Continue to War Room

### 7. Import rounds one-by-one

Add games to the JSON files in `prisma/data/results_2025/`, then run:

```bash
npm run import:2025:r64
```

Refresh the dashboard. Then:

```bash
npm run import:2025:r32
```

Refresh. Then:

```bash
npm run import:2025:s16
```

Refresh. Then:

```bash
npm run import:2025:e8
```

Refresh. Then:

```bash
npm run import:2025:f4
```

Refresh. Then:

```bash
npm run import:2025:final
```

Refresh the dashboard after each import to see scoring update.

## JSON format for results

Each file (`r64.json`, `r32.json`, etc.) is an array of games:

```json
[
  { "winnerName": "Duke", "loserName": "St. Francis (PA)", "winnerScore": 90, "loserScore": 55 },
  { "winnerName": "Alabama", "loserName": "Akron", "winnerScore": 78, "loserScore": 62 }
]
```

- `winnerName` (string) – must match a team in `prisma/data/teams_2025.json`
- `loserName` (string) – same
- `winnerScore`, `loserScore` (optional)
