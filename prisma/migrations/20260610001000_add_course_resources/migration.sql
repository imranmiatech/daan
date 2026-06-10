ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "size" TEXT;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "downloads" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Resource_courseId_idx" ON "Resource"("courseId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Resource_courseId_fkey'
  ) THEN
    ALTER TABLE "Resource" ADD CONSTRAINT "Resource_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
