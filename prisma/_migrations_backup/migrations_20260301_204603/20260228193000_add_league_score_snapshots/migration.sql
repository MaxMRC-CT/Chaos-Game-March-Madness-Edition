CREATE TABLE "LeagueScoreSnapshot" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totals" JSONB NOT NULL,
  CONSTRAINT "LeagueScoreSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeagueScoreSnapshot_leagueId_createdAt_idx" ON "LeagueScoreSnapshot"("leagueId", "createdAt");

ALTER TABLE "LeagueScoreSnapshot"
ADD CONSTRAINT "LeagueScoreSnapshot_leagueId_fkey"
FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
