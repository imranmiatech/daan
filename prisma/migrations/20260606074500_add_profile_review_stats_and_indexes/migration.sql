-- Add review summary fields used by UserProfile responses.
ALTER TABLE "UserProfile"
ADD COLUMN IF NOT EXISTS "totalReviews" INTEGER NOT NULL DEFAULT 0;

-- Keep Resource aligned with the Prisma model.
ALTER TABLE "Resource"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Resource"
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add indexes for common relation and filter paths.
CREATE INDEX IF NOT EXISTS "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");
CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX IF NOT EXISTS "Course_tutorId_idx" ON "Course"("tutorId");
CREATE INDEX IF NOT EXISTS "Course_category_idx" ON "Course"("category");
CREATE INDEX IF NOT EXISTS "Course_enrollmentDeadline_idx" ON "Course"("enrollmentDeadline");
CREATE INDEX IF NOT EXISTS "Education_profileId_idx" ON "Education"("profileId");
CREATE INDEX IF NOT EXISTS "Availability_profileId_idx" ON "Availability"("profileId");
CREATE INDEX IF NOT EXISTS "Availability_dayOfWeek_idx" ON "Availability"("dayOfWeek");
CREATE INDEX IF NOT EXISTS "Resource_tutorId_idx" ON "Resource"("tutorId");
CREATE INDEX IF NOT EXISTS "Review_tutorProfileId_idx" ON "Review"("tutorProfileId");
