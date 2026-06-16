ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "holdUntil" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.2;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "tutorAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paidOutAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "payoutTransferId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "payoutFailureReason" TEXT;

ALTER TABLE "PaymentInformation" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;
ALTER TABLE "PaymentInformation" ADD COLUMN IF NOT EXISTS "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PaymentInformation" ADD COLUMN IF NOT EXISTS "chargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PaymentInformation" ADD COLUMN IF NOT EXISTS "bankLast4" TEXT;
ALTER TABLE "PaymentInformation" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

UPDATE "Payment"
SET
  "paidAt" = COALESCE("paidAt", "createdAt"),
  "holdUntil" = COALESCE("holdUntil", "createdAt" + INTERVAL '48 hours'),
  "commissionRate" = COALESCE("commissionRate", 0.2),
  "commissionAmount" = CASE
    WHEN "commissionAmount" = 0 THEN ROUND(("amount" * COALESCE("commissionRate", 0.2))::numeric, 2)::double precision
    ELSE "commissionAmount"
  END,
  "tutorAmount" = CASE
    WHEN "tutorAmount" = 0 THEN ROUND(("amount" - ("amount" * COALESCE("commissionRate", 0.2)))::numeric, 2)::double precision
    ELSE "tutorAmount"
  END
WHERE "status" = 'PAID';

UPDATE "Payment"
SET "payoutStatus" = 'ON_HOLD'
WHERE "status" = 'PAID'
  AND "payoutStatus" = 'PENDING';

UPDATE "Payment"
SET "paidOutAt" = COALESCE("paidOutAt", "updatedAt")
WHERE "status" = 'PAID'
  AND "payoutStatus" = 'PAID';

CREATE INDEX IF NOT EXISTS "Payment_holdUntil_idx" ON "Payment"("holdUntil");
CREATE INDEX IF NOT EXISTS "Payment_paidAt_idx" ON "Payment"("paidAt");
CREATE INDEX IF NOT EXISTS "PaymentInformation_stripeAccountId_idx" ON "PaymentInformation"("stripeAccountId");
