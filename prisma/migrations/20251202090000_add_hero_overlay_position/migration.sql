-- Add overlay + text position fields to hero banners (idempotent)
ALTER TABLE "herobanner"
  ADD COLUMN IF NOT EXISTS "overlayOn" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "overlayColor" TEXT,
  ADD COLUMN IF NOT EXISTS "textPosition" TEXT NOT NULL DEFAULT 'MIDDLE_LEFT';

-- Add enum-like check constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'herobanner_textPosition_check'
  ) THEN
    ALTER TABLE "herobanner"
    ADD CONSTRAINT "herobanner_textPosition_check" CHECK ("textPosition" IN (
      'TOP_LEFT',
      'TOP_RIGHT',
      'MIDDLE_LEFT',
      'MIDDLE_RIGHT',
      'BOTTOM_LEFT',
      'BOTTOM_RIGHT'
    ));
  END IF;
END $$;
