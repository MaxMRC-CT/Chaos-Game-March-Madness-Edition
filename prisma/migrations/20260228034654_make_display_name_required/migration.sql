/*
  Warnings:

  - Made the column `displayName` on table `LeagueMember` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "LeagueMember" ALTER COLUMN "displayName" SET NOT NULL;
