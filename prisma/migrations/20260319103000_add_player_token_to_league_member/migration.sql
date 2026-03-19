ALTER TABLE "LeagueMember" ADD COLUMN "playerToken" TEXT;

CREATE INDEX "LeagueMember_playerToken_idx" ON "LeagueMember"("playerToken");
