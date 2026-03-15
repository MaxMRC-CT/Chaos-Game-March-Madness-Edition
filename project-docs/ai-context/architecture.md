# Architecture

## Framework
Next.js (App Router)

## Language
TypeScript

## Styling
TailwindCSS

## Database
PostgreSQL via Prisma ORM

## Hosting
Vercel

## Core Data Models

League
- id
- name
- gamePin
- status

Player
- id
- nickname
- leagueId

DraftPick
- id
- playerId
- teamId
- role (hero | villain | cinderella)

Game
- id
- teamA
- teamB
- winner

## Realtime Strategy
Currently uses polling for updates. Real-time infrastructure may be added later.