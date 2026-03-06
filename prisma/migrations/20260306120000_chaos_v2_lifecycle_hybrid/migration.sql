-- Add LOCKED to LeagueStatus enum
ALTER TYPE "LeagueStatus" ADD VALUE IF NOT EXISTS 'LOCKED';

-- Add optional timing columns to League
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "lockDeadline" TIMESTAMP(3);
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "firstTipOff" TIMESTAMP(3);
