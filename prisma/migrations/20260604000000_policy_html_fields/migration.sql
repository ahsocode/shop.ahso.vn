DROP INDEX IF EXISTS "policysection_slug_key";

ALTER TABLE "policysection"
  RENAME COLUMN "title" TO "name";

UPDATE "policysection"
SET "content" = ''
WHERE "content" IS NULL;

ALTER TABLE "policysection"
  ALTER COLUMN "content" SET DEFAULT '',
  ALTER COLUMN "content" SET NOT NULL,
  DROP COLUMN IF EXISTS "slug",
  DROP COLUMN IF EXISTS "description",
  DROP COLUMN IF EXISTS "allowedText",
  DROP COLUMN IF EXISTS "deniedText",
  DROP COLUMN IF EXISTS "updatedAt",
  DROP COLUMN IF EXISTS "createdAt";
