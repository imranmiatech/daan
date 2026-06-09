import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CoursePriceFilter,
  CourseSubjectFilter,
  CreateCourseDto,
  UpcomingCourseDateFilter,
  UpcomingCourseQueryDto,
} from './dto/course.dto';

type CourseWithTutor = Prisma.CourseGetPayload<{
  include: {
    tutor: {
      select: {
        id: true;
        fullName: true;
        email: true;
        role: true;
        profile: {
          select: {
            avatarUrl: true;
            averageRating: true;
            totalReviews: true;
            teachingCategory: true;
          };
        };
      };
    };
  };
}>;

type CourseWithEnrollmentStats = CourseWithTutor & {
  enrolledStudentCount: number;
  enrollmentPercentage: number;
};

type EnrollmentRow = {
  id: string;
  courseId: string;
  studentId: string;
  createdAt: Date;
};

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  async createCourse(tutorId: string, dto: CreateCourseDto) {
    const isTutor = await this.prisma.user.findFirst({
      where: {
        id: tutorId,
        role: Role.TUTOR,
      },
    });

    if (!isTutor) {
      throw new UnauthorizedException(
        'You are not authorized to create a course',
      );
    }

    if (dto.minStudent > dto.maxStudent) {
      throw new BadRequestException(
        'Minimum student must be less than or equal to maximum student',
      );
    }

    const course = await this.prisma.course.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        enrollmentDeadline: new Date(dto.enrollmentDeadline),
        tutorId,
      },
    });

    return {
      success: true,
      message: 'Course created successfully',
      data: course,
    };
  }

  async getCourseById(id: string) {
    const course = await this.prisma.course.findUnique({
      where: {
        id,
      },
      include: this.getCourseTutorInclude(),
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return {
      success: true,
      data: (await this.withTutorCompletedCoursesCount([course]))[0],
    };
  }

  async getAllCourse() {
    const courses = await this.prisma.course.findMany({
      include: this.getCourseTutorInclude(),
    });
    return {
      success: true,
      data: await this.withTutorCompletedCoursesCount(courses),
    };
  }

  async updateCourse(courseId: string, tutorId: string, dto: CreateCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.tutorId !== tutorId) {
      throw new UnauthorizedException('You cannot update this course');
    }

    if (dto.minStudent && dto.maxStudent && dto.minStudent > dto.maxStudent) {
      throw new BadRequestException(
        'Minimum student must be less than maximum student',
      );
    }

    const updatedCourse = await this.prisma.course.update({
      where: {
        id: courseId,
      },
      data: {
        ...dto,
        ...(dto.startDate && {
          startDate: new Date(dto.startDate),
        }),
        ...(dto.enrollmentDeadline && {
          enrollmentDeadline: new Date(dto.enrollmentDeadline),
        }),
      },
    });

    return {
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse,
    };
  }

  async deleteCoursebyId(courseId: string, tutorId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.tutorId !== tutorId) {
      throw new UnauthorizedException('You cannot delete this course');
    }

    await this.prisma.course.delete({
      where: { id: courseId },
    });

    return {
      success: true,
      message: 'Course deleted successfully',
    };
  }

  async completeCurriculum(
    courseId: string,
    curriculumIndex: number,
    studentId: string,
  ) {
    const student = await this.prisma.user.findFirst({
      where: {
        id: studentId,
        role: Role.STUDENT,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      throw new UnauthorizedException('Only students can complete classes');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        curriculums: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.curriculums.length === 0) {
      throw new BadRequestException('Course has no classes to complete');
    }

    if (curriculumIndex < 0 || curriculumIndex >= course.curriculums.length) {
      throw new BadRequestException('Invalid curriculum index');
    }

    await this.prisma.curriculumProgress.upsert({
      where: {
        courseId_studentId_curriculumIndex: {
          courseId,
          studentId,
          curriculumIndex,
        },
      },
      update: {},
      create: {
        courseId,
        studentId,
        curriculumIndex,
      },
    });

    const totalClasses = course.curriculums.length;
    const completedClasses = await this.prisma.curriculumProgress.count({
      where: {
        courseId,
        studentId,
      },
    });

    const isCourseCompleted = completedClasses >= totalClasses;

    if (isCourseCompleted) {
      await this.prisma.courseCompletion.upsert({
        where: {
          courseId_studentId: {
            courseId,
            studentId,
          },
        },
        update: {},
        create: {
          courseId,
          studentId,
        },
      });
    }

    return {
      success: true,
      message: isCourseCompleted
        ? 'Course completed successfully'
        : 'Class completed successfully',
      data: {
        courseId,
        curriculumIndex,
        curriculum: course.curriculums[curriculumIndex],
        completedClasses,
        totalClasses,
        isCourseCompleted,
      },
    };
  }

  async getTutorCompletedCoursesCount(tutorId: string) {
    const completedCourses = await this.prisma.courseCompletion.findMany({
      where: {
        course: {
          tutorId,
        },
      },
      distinct: ['courseId'],
      select: {
        courseId: true,
      },
    });

    return completedCourses.length;
  }

  async enrollCourse(courseId: string, studentId: string) {
    const student = await this.prisma.user.findFirst({
      where: {
        id: studentId,
        role: Role.STUDENT,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      throw new UnauthorizedException('Only students can enroll in courses');
    }

    const course = await this.prisma.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
        id: true,
        maxStudent: true,
        startDate: true,
        enrollmentDeadline: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const now = new Date();

    if (course.startDate <= now) {
      throw new BadRequestException('Course has already started');
    }

    if (course.enrollmentDeadline < now) {
      throw new BadRequestException('Enrollment deadline has passed');
    }

    const enrolledStudentCount = await this.getCourseEnrollmentCount(courseId);

    if (enrolledStudentCount >= course.maxStudent) {
      throw new BadRequestException('Course enrollment is full');
    }

    const existingEnrollment = await this.getStudentCourseEnrollment(
      courseId,
      studentId,
    );

    if (existingEnrollment) {
      throw new BadRequestException('Student is already enrolled');
    }

    const enrollment = await this.createCourseEnrollment(courseId, studentId);
    const updatedEnrolledStudentCount = enrolledStudentCount + 1;

    return {
      success: true,
      message: 'Student enrolled successfully',
      data: {
        ...enrollment,
        enrolledStudentCount: updatedEnrolledStudentCount,
        maxStudent: course.maxStudent,
        enrollmentPercentage: this.calculateEnrollmentPercentage(
          updatedEnrolledStudentCount,
          course.maxStudent,
        ),
      },
    };
  }

  async getUpcomingCourses(query: UpcomingCourseQueryDto) {
    const { subject, price, date } = query;

    const where: Prisma.CourseWhereInput = {
      startDate: this.getUpcomingStartDateFilter(date),
    };

    if (subject && subject !== CourseSubjectFilter.ALL) {
      where.category = {
        equals: subject,
        mode: 'insensitive',
      };
    }

    if (price && price !== CoursePriceFilter.ALL) {
      if (price === CoursePriceFilter.ZERO_TO_FORTY) {
        where.pricePerStudent = {
          gte: 0,
          lte: 40,
        };
      }

      if (price === CoursePriceFilter.FORTY_TO_SIXTY) {
        where.pricePerStudent = {
          gte: 40,
          lte: 60,
        };
      }

      if (price === CoursePriceFilter.SIXTY_PLUS) {
        where.pricePerStudent = {
          gte: 60,
        };
      }
    }

    const courses = await this.prisma.course.findMany({
      where,
      include: this.getCourseTutorInclude(),
      orderBy: {
        startDate: 'asc',
      },
    });

    return {
      success: true,
      filters: {
        subject: subject ?? CourseSubjectFilter.ALL,
        price: price ?? CoursePriceFilter.ALL,
        date: date ?? UpcomingCourseDateFilter.ALL,
      },
      data: await this.withTutorCompletedCoursesCount(
        await this.withEnrollmentStats(courses),
      ),
    };
  }

  private getCourseTutorInclude() {
    return {
      tutor: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          profile: {
            select: {
              avatarUrl: true,
              averageRating: true,
              totalReviews: true,
              teachingCategory: true,
            },
          },
        },
      },
    } satisfies Prisma.CourseInclude;
  }

  private getUpcomingStartDateFilter(
    date?: UpcomingCourseDateFilter,
  ): Prisma.DateTimeFilter {
    const now = new Date();

    if (date === UpcomingCourseDateFilter.STARTING_SOON) {
      const sevenDaysFromNow = new Date(now);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      return {
        gte: now,
        lte: sevenDaysFromNow,
      };
    }

    if (date === UpcomingCourseDateFilter.THIS_WEEK) {
      const endOfWeek = new Date(now);
      const daysUntilSunday = (7 - endOfWeek.getDay()) % 7;
      endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
      endOfWeek.setHours(23, 59, 59, 999);

      return {
        gte: now,
        lte: endOfWeek,
      };
    }

    if (date === UpcomingCourseDateFilter.THIS_MONTH) {
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      return {
        gte: now,
        lte: endOfMonth,
      };
    }

    return {
      gte: now,
    };
  }

  private async withEnrollmentStats(
    courses: CourseWithTutor[],
  ): Promise<CourseWithEnrollmentStats[]> {
    const courseIds = courses.map((course) => course.id);

    if (courseIds.length === 0) {
      return [];
    }

    const enrollmentCounts = await this.prisma.$queryRaw<
      { courseId: string; count: number }[]
    >`
      SELECT "courseId", COUNT(*)::integer AS "count"
      FROM "CourseEnrollment"
      WHERE "courseId" IN (${Prisma.join(courseIds)})
      GROUP BY "courseId"
    `;

    const enrollmentCountByCourse = enrollmentCounts.reduce<
      Record<string, number>
    >((counts, enrollmentCount) => {
      counts[enrollmentCount.courseId] = enrollmentCount.count;
      return counts;
    }, {});

    return courses.map((course) => {
      const enrolledStudentCount = enrollmentCountByCourse[course.id] ?? 0;

      return {
        ...course,
        enrolledStudentCount,
        enrollmentPercentage: this.calculateEnrollmentPercentage(
          enrolledStudentCount,
          course.maxStudent,
        ),
      };
    });
  }

  private async getCourseEnrollmentCount(courseId: string) {
    const [enrollmentCount] = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::integer AS "count"
      FROM "CourseEnrollment"
      WHERE "courseId" = ${courseId}
    `;

    return enrollmentCount?.count ?? 0;
  }

  private async getStudentCourseEnrollment(
    courseId: string,
    studentId: string,
  ) {
    const [enrollment] = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "CourseEnrollment"
      WHERE "courseId" = ${courseId}
        AND "studentId" = ${studentId}
      LIMIT 1
    `;

    return enrollment ?? null;
  }

  private async createCourseEnrollment(courseId: string, studentId: string) {
    const [enrollment] = await this.prisma.$queryRaw<EnrollmentRow[]>`
      INSERT INTO "CourseEnrollment" ("id", "courseId", "studentId")
      VALUES (${randomUUID()}, ${courseId}, ${studentId})
      RETURNING "id", "courseId", "studentId", "createdAt"
    `;

    return enrollment;
  }

  private calculateEnrollmentPercentage(
    enrolledStudentCount: number,
    maxStudent: number,
  ) {
    if (maxStudent <= 0) {
      return 0;
    }

    return Math.round((enrolledStudentCount / maxStudent) * 100);
  }

  private async withTutorCompletedCoursesCount(courses: CourseWithTutor[]) {
    const tutorIds = [...new Set(courses.map((course) => course.tutorId))];

    if (tutorIds.length === 0) {
      return courses;
    }

    const completedCourses = await this.prisma.courseCompletion.findMany({
      where: {
        course: {
          tutorId: {
            in: tutorIds,
          },
        },
      },
      distinct: ['courseId'],
      select: {
        course: {
          select: {
            tutorId: true,
          },
        },
      },
    });

    const completedCourseCountByTutor = completedCourses.reduce<
      Record<string, number>
    >((counts, completion) => {
      const tutorId = completion.course.tutorId;
      counts[tutorId] = (counts[tutorId] ?? 0) + 1;
      return counts;
    }, {});

    return courses.map((course) => ({
      ...course,
      tutor: {
        ...course.tutor,
        profile: course.tutor.profile
          ? {
              ...course.tutor.profile,
              completedCoursesCount:
                completedCourseCountByTutor[course.tutorId] ?? 0,
            }
          : null,
      },
    }));
  }
}
