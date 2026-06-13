import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentStatus, PaymentType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AgoraService } from '../agora/agora.service';
import {
  ClassStudentsQueryDto,
  CreateClassResourceDto,
} from './dto/classes.dto';

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agoraService: AgoraService,
  ) {}

  async getMeta(tutorId: string, courseId: string) {
    await this.assertTutorCourse(tutorId, courseId);

    const [enrolledStudents, totalEarning, lessons] = await Promise.all([
      this.prisma.courseEnrollment.count({
        where: { courseId },
      }),
      this.prisma.payment.aggregate({
        where: {
          tutorId,
          courseId,
          type: PaymentType.GROUP,
          status: PaymentStatus.PAID,
        },
        _sum: {
          amount: true,
        },
      }),
      this.getCourseLessons(courseId),
    ]);

    const nextLesson = this.getNextLesson(lessons);

    return {
      success: true,
      data: {
        enrolledStudents,
        totalEarning: totalEarning._sum.amount ?? 0,
        nextLesson: nextLesson
          ? {
              id: nextLesson.id,
              title: nextLesson.title,
              date: nextLesson.date,
              time: nextLesson.time,
              status: nextLesson.status,
            }
          : null,
      },
    };
  }

  async getOverview(tutorId: string, courseId: string) {
    const course = await this.assertTutorCourse(tutorId, courseId);

    const [enrolledStudents, totalEarning, curriculumItems] = await Promise.all(
      [
        this.prisma.courseEnrollment.count({
          where: { courseId },
        }),
        this.prisma.payment.aggregate({
          where: {
            tutorId,
            courseId,
            type: PaymentType.GROUP,
            status: PaymentStatus.PAID,
          },
          _sum: {
            amount: true,
          },
        }),
        this.getCourseLessons(courseId),
      ],
    );

    const nextLesson = this.getNextLesson(curriculumItems);

    return {
      success: true,
      data: {
        course: {
          id: course.id,
          title: course.title,
          description: course.description,
          image: course.image,
          category: course.category,
          startDate: course.startDate,
          time: course.time,
          timeZone: course.timeZone,
        },
        stats: {
          enrolledStudents,
          totalEarning: totalEarning._sum.amount ?? 0,
          nextLesson: nextLesson
            ? {
                id: nextLesson.id,
                title: nextLesson.title,
                date: nextLesson.date,
                time: nextLesson.time,
                status: nextLesson.status,
              }
            : null,
        },
      },
    };
  }

  async getStudents(
    tutorId: string,
    courseId: string,
    query: ClassStudentsQueryDto,
  ) {
    await this.assertTutorCourse(tutorId, courseId);

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(Math.max(1, query.limit || 10), 100);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.CourseEnrollmentWhereInput = {
      courseId,
      ...(search && {
        student: {
          OR: [
            {
              fullName: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        },
      }),
    };

    const [total, enrollments] = await Promise.all([
      this.prisma.courseEnrollment.count({ where }),
      this.prisma.courseEnrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
              curriculumProgress: {
                where: {
                  courseId,
                },
                select: {
                  id: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const from = total === 0 ? 0 : skip + 1;
    const to = Math.min(skip + enrollments.length, total);

    return {
      success: true,
      data: enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        studentId: enrollment.student.id,
        studentName: enrollment.student.fullName,
        studentEmail: enrollment.student.email,
        studentImage: enrollment.student.profile?.avatarUrl ?? null,
        enrolled: enrollment.createdAt,
        lessonCompleted: enrollment.student.curriculumProgress.length,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        from,
        to,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
      filters: {
        search: search ?? null,
      },
    };
  }

  async getEnrolledStudents(tutorId: string, courseId: string) {
    await this.assertTutorCourse(tutorId, courseId);

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { courseId },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profile: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        studentId: enrollment.student.id,
        studentImage: enrollment.student.profile?.avatarUrl ?? null,
        studentName: enrollment.student.fullName,
        studentEmail: enrollment.student.email,
        enrolledAt: enrollment.createdAt,
        enrolledDate: this.formatDate(enrollment.createdAt),
        enrolledTime: this.formatTime(enrollment.createdAt),
      })),
    };
  }

  async deleteEnrolledStudent(
    tutorId: string,
    courseId: string,
    studentId: string,
  ) {
    await this.assertTutorCourse(tutorId, courseId);

    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException(
        'Student enrollment not found for this class',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const deletedProgress = await tx.curriculumProgress.deleteMany({
        where: {
          courseId,
          studentId,
        },
      });

      const deletedCompletion = await tx.courseCompletion.deleteMany({
        where: {
          courseId,
          studentId,
        },
      });

      await tx.courseEnrollment.delete({
        where: {
          courseId_studentId: {
            courseId,
            studentId,
          },
        },
      });

      return {
        deletedProgress: deletedProgress.count,
        deletedCompletion: deletedCompletion.count,
      };
    });

    return {
      success: true,
      message: 'Student removed from this class successfully',
      data: {
        courseId,
        studentId,
        deletedEnrollment: 1,
        ...result,
      },
    };
  }

  async getLessons(tutorId: string, courseId: string) {
    await this.assertTutorCourse(tutorId, courseId);

    const lessons = await this.getCourseLessons(courseId);
    const enrolledStudents = await this.prisma.courseEnrollment.count({
      where: { courseId },
    });

    return {
      success: true,
      data: lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        date: lesson.date,
        time: lesson.time,
        status: lesson.status,
        attendant:
          lesson.status === 'completed'
            ? `${enrolledStudents} attendant`
            : null,
        joinAvailable: lesson.status === 'live',
      })),
    };
  }

  async getLessonJoinPreview(
    tutorId: string,
    courseId: string,
    curriculumIndex: number,
  ) {
    await this.assertTutorCourse(tutorId, courseId);
    const lesson = await this.getCourseLesson(courseId, curriculumIndex);

    if (lesson.status === 'completed') {
      throw new BadRequestException('This lesson is already completed');
    }

    const enrolledStudents = await this.prisma.courseEnrollment.count({
      where: { courseId },
    });

    return {
      success: true,
      data: {
        lesson: {
          id: lesson.id,
          courseId,
          curriculumIndex,
          title: lesson.title,
          date: lesson.date,
          time: lesson.time,
          durationMinutes: lesson.durationMinutes,
          status: lesson.status,
          enrolledStudents,
        },
        deviceChecks: [
          {
            type: 'camera',
            label: 'Camera is ready',
            required: true,
          },
          {
            type: 'microphone',
            label: 'Microphone is ready',
            required: true,
          },
        ],
        agora: {
          ...this.agoraService.getClientConfig(),
          channelName: this.agoraService.buildChannelName(
            courseId,
            curriculumIndex,
          ),
        },
      },
    };
  }

  async joinLesson(tutorId: string, courseId: string, curriculumIndex: number) {
    await this.assertTutorCourse(tutorId, courseId);
    const lesson = await this.getCourseLesson(courseId, curriculumIndex);

    if (lesson.status === 'completed') {
      throw new BadRequestException('This lesson is already completed');
    }

    const channelName = this.agoraService.buildChannelName(
      courseId,
      curriculumIndex,
    );

    return {
      success: true,
      data: {
        lesson: {
          id: lesson.id,
          courseId,
          curriculumIndex,
          title: lesson.title,
          date: lesson.date,
          time: lesson.time,
          durationMinutes: lesson.durationMinutes,
          status: lesson.status,
        },
        agora: this.agoraService.buildRtcToken({
          channelName,
          account: tutorId,
          role: 'publisher',
        }),
      },
    };
  }

  async getResources(tutorId: string, courseId: string) {
    await this.assertTutorCourse(tutorId, courseId);

    const resources = await this.prisma.resource.findMany({
      where: {
        tutorId,
        courseId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: resources.map((resource) => ({
        resourceId: resource.id,
        name: resource.name,
        url: resource.url,
        size: resource.size ?? 'N/A',
        downloads: resource.downloads,
        createdAt: resource.createdAt,
      })),
    };
  }

  async addResource(
    tutorId: string,
    courseId: string,
    dto: CreateClassResourceDto,
  ) {
    await this.assertTutorCourse(tutorId, courseId);

    const resource = await this.prisma.resource.create({
      data: {
        tutorId,
        courseId,
        name: dto.name,
        url: dto.url,
        size: dto.size,
      },
    });

    return {
      success: true,
      message: 'Resource added successfully',
      data: {
        resourceId: resource.id,
        name: resource.name,
        url: resource.url,
        size: resource.size ?? 'N/A',
        downloads: resource.downloads,
        createdAt: resource.createdAt,
      },
    };
  }

  async deleteResource(tutorId: string, courseId: string, resourceId: string) {
    await this.assertTutorCourse(tutorId, courseId);

    const resource = await this.prisma.resource.findFirst({
      where: {
        id: resourceId,
        tutorId,
        courseId,
      },
      select: {
        id: true,
      },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found for this class');
    }

    await this.prisma.resource.delete({
      where: { id: resource.id },
    });

    return {
      success: true,
      message: 'Resource deleted successfully',
    };
  }

  private async assertTutorCourse(tutorId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        tutorId: true,
        title: true,
        category: true,
        description: true,
        image: true,
        curriculums: true,
        startDate: true,
        time: true,
        timeZone: true,
        classDuration: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.tutorId !== tutorId) {
      throw new UnauthorizedException('You cannot access this class');
    }

    return course;
  }

  private async getCourseLessons(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        curriculums: true,
        startDate: true,
        time: true,
        classDuration: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course.curriculums.map((title, index) => {
      const date = new Date(course.startDate);
      date.setDate(date.getDate() + index);
      const lessonDate = this.combineDateAndTime(date, course.time);

      return {
        id: `${courseId}-${index}`,
        title,
        date,
        time: course.time,
        durationMinutes: course.classDuration,
        status: this.getLessonStatus(lessonDate, course.classDuration),
      };
    });
  }

  private async getCourseLesson(courseId: string, curriculumIndex: number) {
    const lessons = await this.getCourseLessons(courseId);
    const lesson = lessons[curriculumIndex];

    if (!lesson) {
      throw new NotFoundException('Lesson not found for this class');
    }

    return lesson;
  }

  private getNextLesson(
    lessons: {
      id: string;
      title: string;
      date: Date;
      time: string;
      status: string;
    }[],
  ) {
    return (
      lessons.find(
        (lesson) => lesson.status === 'live' || lesson.status === 'upcoming',
      ) ?? null
    );
  }

  private getLessonStatus(lessonDate: Date, durationMinutes: number) {
    const now = new Date();
    const lessonEnd = new Date(
      lessonDate.getTime() + durationMinutes * 60 * 1000,
    );

    if (now >= lessonDate && now <= lessonEnd) {
      return 'live';
    }

    if (now > lessonEnd) {
      return 'completed';
    }

    return 'upcoming';
  }

  private combineDateAndTime(date: Date, time: string) {
    const combined = new Date(date);
    const parsed = this.parseTime(time);

    if (parsed) {
      combined.setHours(parsed.hours, parsed.minutes, 0, 0);
    }

    return combined;
  }

  private parseTime(time: string) {
    const normalized = time.trim().toLowerCase();
    const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);

    if (!match) {
      return null;
    }

    let hours = Number(match[1]);
    const minutes = match[2] ? Number(match[2]) : 0;
    const meridiem = match[3];

    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    }

    if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    if (hours > 23 || minutes > 59) {
      return null;
    }

    return { hours, minutes };
  }

  private formatDate(date: Date) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
