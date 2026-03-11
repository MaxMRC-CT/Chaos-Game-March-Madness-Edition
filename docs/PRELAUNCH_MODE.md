# Prelaunch Mode

When `PRELAUNCH_MODE=true`, the homepage renders a marketing-style pre-launch landing page instead of the interactive create-join flow.

## Environment Flag

Add to your `.env`, `.env.local`, `.env.development`, or `.env.production`:

```
PRELAUNCH_MODE=true
```

**To disable** (restore normal homepage): remove the variable or set `PRELAUNCH_MODE=false`.

## Behavior

| `PRELAUNCH_MODE` | Homepage renders |
|------------------|------------------|
| `"true"` (string) | Prelaunch landing page |
| unset, `false`, or any other | Normal homepage (Create League form) |

## Unaffected Routes

- `/guide` — League Guide / FAQ
- `/join` — Join by PIN
- `/my-leagues` — My Leagues
- `/league/[leagueId]/*` — All league routes
