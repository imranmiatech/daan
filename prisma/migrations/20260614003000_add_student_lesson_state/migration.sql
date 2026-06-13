CREATE TABLE "StudentLessonState" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "curriculumIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentLessonState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentLessonState_courseId_studentId_curriculumIndex_key" ON "StudentLessonState"("courseId", "studentId", "curriculumIndex");
CREATE INDEX "StudentLessonState_studentId_idx" ON "StudentLessonState"("studentId");
CREATE INDEX "StudentLessonState_courseId_idx" ON "StudentLessonState"("courseId");
CREATE INDEX "StudentLessonState_status_idx" ON "StudentLessonState"("status");

ALTER TABLE "StudentLessonState" ADD CONSTRAINT "StudentLessonState_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentLessonState" ADD CONSTRAINT "StudentLessonState_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
