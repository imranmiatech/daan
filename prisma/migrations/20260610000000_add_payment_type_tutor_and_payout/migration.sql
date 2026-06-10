-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentType') THEN
    CREATE TYPE "PaymentType" AS ENUM ('GROUP', 'PRIVATE');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayoutStatus') THEN
    CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID');
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "tutorId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "type" "PaymentType" NOT NULL DEFAULT 'GROUP';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Payment" ALTER COLUMN "courseId" DROP NOT NULL;

-- Backfill existing group payments with the course owner.
UPDATE "Payment"
SET "tutorId" = "Course"."tutorId"
FROM "Course"
WHERE "Payment"."courseId" = "Course"."id"
  AND "Payment"."tutorId" IS NULL;

-- Existing rows are all group course payments, so they should now have a tutor.
ALTER TABLE "Payment" ALTER COLUMN "tutorId" SET NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_tutorId_idx" ON "Payment"("tutorId");
CREATE INDEX IF NOT EXISTS "Payment_type_idx" ON "Payment"("type");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");
CREATE INDEX IF NOT EXISTS "Payment_payoutStatus_idx" ON "Payment"("payoutStatus");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payment_tutorId_fkey'
  ) THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
