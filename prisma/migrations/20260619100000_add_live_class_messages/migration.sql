CREATE TYPE "LiveClassRoomType" AS ENUM ('GROUP', 'PRIVATE');

CREATE TYPE "LiveClassMessageType" AS ENUM ('TEXT', 'RESOURCE');

CREATE TABLE "LiveClassMessage" (
    "id" TEXT NOT NULL,
    "roomType" "LiveClassRoomType" NOT NULL,
    "courseId" TEXT,
    "curriculumIndex" INTEGER,
    "paymentId" TEXT,
    "senderId" TEXT NOT NULL,
    "messageType" "LiveClassMessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT,
    "resourceName" TEXT,
    "resourceUrl" TEXT,
    "resourceMimeType" TEXT,
    "resourceSize" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveClassMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiveClassMessage_roomType_courseId_curriculumIndex_createdAt_idx" ON "LiveClassMessage"("roomType", "courseId", "curriculumIndex", "createdAt");
CREATE INDEX "LiveClassMessage_roomType_paymentId_createdAt_idx" ON "LiveClassMessage"("roomType", "paymentId", "createdAt");
CREATE INDEX "LiveClassMessage_senderId_idx" ON "LiveClassMessage"("senderId");
CREATE INDEX "LiveClassMessage_messageType_idx" ON "LiveClassMessage"("messageType");

ALTER TABLE "LiveClassMessage" ADD CONSTRAINT "LiveClassMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
