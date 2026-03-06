-- AlterTable
ALTER TABLE "LeagueMember" ADD COLUMN "deviceToken" TEXT;
ALTER TABLE "LeagueMember" ADD COLUMN "reconnectCode" TEXT;

-- Backfill nicknameKey for legacy rows before enforcing NOT NULL
UPDATE "LeagueMember"
SET "nicknameKey" = lower(trim(regexp_replace(COALESCE("displayName", "nickname"), '\s+', ' ', 'g')))
WHERE "nicknameKey" IS NULL OR btrim("nicknameKey") = '';

-- Backfill reconnect codes for legacy rows with a human-readable format XXXX-XXXX
UPDATE "LeagueMember"
SET "reconnectCode" = concat(
  substr(
    upper(translate(md5("id" || random()::text || clock_timestamp()::text), '0O1I', '2345')),
    1,
    4
  ),
  '-',
  substr(
    upper(translate(md5(random()::text || "id" || clock_timestamp()::text), '0O1I', '2345')),
    1,
    4
  )
)
WHERE "reconnectCode" IS NULL;

-- Enforce required columns
ALTER TABLE "LeagueMember" ALTER COLUMN "nicknameKey" SET NOT NULL;
ALTER TABLE "LeagueMember" ALTER COLUMN "reconnectCode" SET NOT NULL;

-- Add unique constraint for reconnect code
CREATE UNIQUE INDEX "LeagueMember_reconnectCode_key" ON "LeagueMember"("reconnectCode");
