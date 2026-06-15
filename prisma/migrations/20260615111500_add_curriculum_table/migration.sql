-- CreateTable
CREATE TABLE "Curriculum" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,

    CONSTRAINT "Curriculum_pkey" PRIMARY KEY ("id")
);

-- Backfill existing course lessons from the legacy Course.curriculums array.
INSERT INTO "Curriculum" ("id", "courseId", "title", "date", "time")
SELECT
    "Course"."id" || '-curriculum-' || (lesson."index" - 1)::text,
    "Course"."id",
    lesson."title",
    "Course"."startDate" + ((lesson."index" - 1) * INTERVAL '1 day'),
    "Course"."time"
FROM "Course"
CROSS JOIN LATERAL unnest("Course"."curriculums") WITH ORDINALITY AS lesson("title", "index")
WHERE NOT EXISTS (
    SELECT 1
    FROM "Curriculum"
    WHERE "Curriculum"."courseId" = "Course"."id"
);

-- CreateIndex
CREATE INDEX "Curriculum_courseId_idx" ON "Curriculum"("courseId");

-- AddForeignKey
ALTER TABLE "Curriculum" ADD CONSTRAINT "Curriculum_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
