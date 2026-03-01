-- CreateEnum
CREATE TYPE "LeagueStatus" AS ENUM ('SETUP', 'LOBBY', 'DRAFT', 'LIVE', 'COMPLETE');

-- CreateEnum
CREATE TYPE "PickCategory" AS ENUM ('HERO', 'VILLAIN', 'CINDERELLA');

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

    CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPick" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "category" "PickCategory" NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftPick_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "LeagueMember_leagueId_idx" ON "LeagueMember"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMember_leagueId_nickname_key" ON "LeagueMember"("leagueId", "nickname");

-- CreateIndex
CREATE INDEX "DraftPick_leagueId_idx" ON "DraftPick"("leagueId");

-- CreateIndex
CREATE INDEX "DraftPick_memberId_idx" ON "DraftPick"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_leagueId_teamId_key" ON "DraftPick"("leagueId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_leagueId_pickNumber_key" ON "DraftPick"("leagueId", "pickNumber");

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
