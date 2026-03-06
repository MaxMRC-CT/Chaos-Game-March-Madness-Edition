-- CreateEnum
CREATE TYPE "LeagueStatus" AS ENUM ('SETUP', 'DRAFT', 'LIVE', 'COMPLETE');

-- CreateEnum
CREATE TYPE "DraftRole" AS ENUM ('HERO', 'VILLAIN', 'CINDERELLA');

-- CreateEnum
CREATE TYPE "Round" AS ENUM ('R64', 'R32', 'S16', 'E8', 'F4', 'FINAL', 'CHAMP');

-- CreateTable
CREATE TABLE "TournamentYear" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "tournamentYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "seed" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "tournamentYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "LeagueStatus" NOT NULL DEFAULT 'SETUP',
    "currentPick" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMember" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "draftPosition" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "displayName" TEXT NOT NULL,
    "nicknameKey" TEXT NOT NULL,
    "deviceToken" TEXT,
    "reconnectCode" TEXT NOT NULL,

    CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPick" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "DraftRole" NOT NULL,

    CONSTRAINT "DraftPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "TeamResult" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "eliminatedRound" "Round",
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueScore" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totals" JSONB NOT NULL,

    CONSTRAINT "LeagueScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueScoreSnapshot" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totals" JSONB NOT NULL,

    CONSTRAINT "LeagueScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueEvent" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentYear_year_key" ON "TournamentYear"("year");

-- CreateIndex
CREATE INDEX "Team_tournamentYearId_idx" ON "Team"("tournamentYearId");

-- CreateIndex
CREATE INDEX "Team_tournamentYearId_seed_idx" ON "Team"("tournamentYearId", "seed");

-- CreateIndex
CREATE UNIQUE INDEX "League_code_key" ON "League"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMember_reconnectCode_key" ON "LeagueMember"("reconnectCode");

-- CreateIndex
CREATE INDEX "LeagueMember_leagueId_idx" ON "LeagueMember"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMember_leagueId_nicknameKey_key" ON "LeagueMember"("leagueId", "nicknameKey");

-- CreateIndex
CREATE INDEX "DraftPick_leagueId_idx" ON "DraftPick"("leagueId");

-- CreateIndex
CREATE INDEX "DraftPick_memberId_idx" ON "DraftPick"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_leagueId_memberId_role_key" ON "DraftPick"("leagueId", "memberId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_leagueId_teamId_key" ON "DraftPick"("leagueId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_leagueId_pickNumber_key" ON "DraftPick"("leagueId", "pickNumber");

-- CreateIndex
CREATE INDEX "TournamentGame_leagueId_idx" ON "TournamentGame"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentGame_leagueId_round_gameNo_key" ON "TournamentGame"("leagueId", "round", "gameNo");

-- CreateIndex
CREATE INDEX "TeamResult_leagueId_idx" ON "TeamResult"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamResult_leagueId_teamId_key" ON "TeamResult"("leagueId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueScore_leagueId_key" ON "LeagueScore"("leagueId");

-- CreateIndex
CREATE INDEX "LeagueScoreSnapshot_leagueId_createdAt_idx" ON "LeagueScoreSnapshot"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX "LeagueEvent_leagueId_createdAt_idx" ON "LeagueEvent"("leagueId", "createdAt");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_tournamentYearId_fkey" FOREIGN KEY ("tournamentYearId") REFERENCES "TournamentYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_tournamentYearId_fkey" FOREIGN KEY ("tournamentYearId") REFERENCES "TournamentYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LeagueMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentGame" ADD CONSTRAINT "TournamentGame_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentGame" ADD CONSTRAINT "TournamentGame_loserTeamId_fkey" FOREIGN KEY ("loserTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentGame" ADD CONSTRAINT "TournamentGame_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamResult" ADD CONSTRAINT "TeamResult_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamResult" ADD CONSTRAINT "TeamResult_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueScore" ADD CONSTRAINT "LeagueScore_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueScoreSnapshot" ADD CONSTRAINT "LeagueScoreSnapshot_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueEvent" ADD CONSTRAINT "LeagueEvent_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
