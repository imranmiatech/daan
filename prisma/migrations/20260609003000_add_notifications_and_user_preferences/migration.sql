-- Add user notification preference columns expected by the current User model.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "notifyCourseUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "notifyNewContent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "notifyLessonReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "notifyNewMessages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "notifyWeeklyDigest" BOOLEAN NOT NULL DEFAULT false;

-- Align the existing Contact migration with the current Contact model.
ALTER TABLE "Contact"
ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Contact"
ALTER COLUMN "phone" DROP DEFAULT;

-- Create notifications storage for the Notifications module.
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "targetUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
