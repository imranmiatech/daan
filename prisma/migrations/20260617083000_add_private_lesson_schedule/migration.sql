ALTER TABLE "Payment"
ADD COLUMN "privateLessonStartsAt" TIMESTAMP(3),
ADD COLUMN "privateLessonDuration" INTEGER,
ADD COLUMN "privateLessonSessions" INTEGER;

CREATE INDEX "Payment_privateLessonStartsAt_idx" ON "Payment"("privateLessonStartsAt");
