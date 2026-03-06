-- Update LeagueStatus enum to remove LOBBY
CREATE TYPE "LeagueStatus_new" AS ENUM ('SETUP', 'DRAFT', 'LIVE', 'COMPLETE');
ALTER TABLE "League" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "League"
ALTER COLUMN "status" TYPE "LeagueStatus_new"
USING (
  CASE
    WHEN "status"::text = 'LOBBY' THEN 'SETUP'
    ELSE "status"::text
  END
)::"LeagueStatus_new";
DROP TYPE "LeagueStatus";
ALTER TYPE "LeagueStatus_new" RENAME TO "LeagueStatus";
ALTER TABLE "League" ALTER COLUMN "status" SET DEFAULT 'SETUP';

-- Draft role and rounds
CREATE TYPE "DraftRole" AS ENUM ('HERO', 'VILLAIN', 'CINDERELLA');
CREATE TYPE "Round" AS ENUM ('R64', 'R32', 'S16', 'E8', 'F4', 'FINAL', 'CHAMP');

-- Clear legacy picks to avoid invalid role uniqueness conflicts from old schema
DELETE FROM "DraftPick";

-- Replace DraftPick.category with DraftPick.role
ALTER TABLE "DraftPick" ADD COLUMN "role" "DraftRole" NOT NULL DEFAULT 'HERO';
ALTER TABLE "DraftPick" DROP COLUMN "category";
DROP TYPE "PickCategory";
ALTER TABLE "DraftPick" ALTER COLUMN "role" DROP DEFAULT;

-- New deterministic results and feed tables
CREATE TABLE "TournamentGame" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "round" "Round" NOT NULL,
  "gameNo" INTEGER NOT NULL,
  "winnerTeamId" TEXT NOT NULL,
  "loserTeamId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TournamentGame_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamResult" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "eliminatedRound" "Round",
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeamResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeagueScore" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "totals" JSONB NOT NULL,
  CONSTRAINT "LeagueScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeagueEvent" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeagueEvent_pkey" PRIMARY KEY ("id")
);

-- Constraints and indexes
CREATE UNIQUE INDEX "DraftPick_leagueId_memberId_role_key" ON "DraftPick"("leagueId", "memberId", "role");
DROP INDEX "DraftPick_leagueId_teamId_key";
CREATE UNIQUE INDEX "DraftPick_leagueId_teamId_key" ON "DraftPick"("leagueId", "teamId");
DROP INDEX "DraftPick_leagueId_pickNumber_key";
CREATE UNIQUE INDEX "DraftPick_leagueId_pickNumber_key" ON "DraftPick"("leagueId", "pickNumber");

CREATE UNIQUE INDEX "TournamentGame_leagueId_round_gameNo_key" ON "TournamentGame"("leagueId", "round", "gameNo");
CREATE INDEX "TournamentGame_leagueId_idx" ON "TournamentGame"("leagueId");

CREATE UNIQUE INDEX "TeamResult_leagueId_teamId_key" ON "TeamResult"("leagueId", "teamId");
CREATE INDEX "TeamResult_leagueId_idx" ON "TeamResult"("leagueId");

CREATE UNIQUE INDEX "LeagueScore_leagueId_key" ON "LeagueScore"("leagueId");
CREATE INDEX "LeagueEvent_leagueId_createdAt_idx" ON "LeagueEvent"("leagueId", "createdAt");

-- Foreign keys
ALTER TABLE "TournamentGame"
ADD CONSTRAINT "TournamentGame_leagueId_fkey"
FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TournamentGame"
ADD CONSTRAINT "TournamentGame_winnerTeamId_fkey"
FOREIGN KEY ("winnerTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TournamentGame"
ADD CONSTRAINT "TournamentGame_loserTeamId_fkey"
FOREIGN KEY ("loserTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeamResult"
ADD CONSTRAINT "TeamResult_leagueId_fkey"
FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeamResult"
ADD CONSTRAINT "TeamResult_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeagueScore"
ADD CONSTRAINT "LeagueScore_leagueId_fkey"
FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeagueEvent"
ADD CONSTRAINT "LeagueEvent_leagueId_fkey"
FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
