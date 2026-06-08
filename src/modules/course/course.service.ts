import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CoursePriceFilter,
  CourseSubjectFilter,
  CreateCourseDto,
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

  async getUpcomingCourses(query: UpcomingCourseQueryDto) {
    const { subject, price } = query;

    const where: Prisma.CourseWhereInput = {
      startDate: {
        gte: new Date(),
      },
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
      },
      data: await this.withTutorCompletedCoursesCount(courses),
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
