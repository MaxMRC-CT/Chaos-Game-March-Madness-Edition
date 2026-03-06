-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('HERO', 'VILLAIN', 'CINDERELLA');

-- CreateTable
CREATE TABLE "PortfolioPick" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "role" "RoleType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioPick_leagueId_memberId_teamId_key" ON "PortfolioPick"("leagueId", "memberId", "teamId");

-- CreateIndex
CREATE INDEX "PortfolioPick_leagueId_idx" ON "PortfolioPick"("leagueId");

-- CreateIndex
CREATE INDEX "PortfolioPick_memberId_idx" ON "PortfolioPick"("memberId");

-- AddForeignKey
ALTER TABLE "PortfolioPick" ADD CONSTRAINT "PortfolioPick_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioPick" ADD CONSTRAINT "PortfolioPick_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LeagueMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioPick" ADD CONSTRAINT "PortfolioPick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
