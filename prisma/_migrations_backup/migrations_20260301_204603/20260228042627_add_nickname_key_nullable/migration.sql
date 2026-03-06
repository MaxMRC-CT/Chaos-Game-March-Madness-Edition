/*
  Warnings:

  - A unique constraint covering the columns `[leagueId,nicknameKey]` on the table `LeagueMember` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "LeagueMember_leagueId_nickname_key";

-- AlterTable
ALTER TABLE "LeagueMember" ADD COLUMN     "nicknameKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMember_leagueId_nicknameKey_key" ON "LeagueMember"("leagueId", "nicknameKey");
