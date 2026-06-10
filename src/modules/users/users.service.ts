import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ApplicationStatus,
  PaymentStatus,
  PaymentType,
  Prisma,
} from '@prisma/client';
import {
  TutorStudentCourseTypeFilter,
  TutorStudentsQueryDto,
} from './dto/tutor-students-query.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        profile: true,
      },
    });
  }

  async findAllTutors(page = 1) {
    const limit = 6;
    const currentPage = Math.max(1, page);
    const skip = (currentPage - 1) * limit;

    const [profiles, total, completedCourses] = await this.prisma.$transaction([
      this.prisma.userProfile.findMany({
        where: {
          applicationStatus: ApplicationStatus.APPROVED,
          user: {
            role: 'TUTOR',
          },
        },
        include: {
          user: true,
        },
        orderBy: [
          {
            averageRating: {
              sort: 'desc',
              nulls: 'last',
            },
          },
          { totalReviews: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.userProfile.count({
        where: {
          applicationStatus: ApplicationStatus.APPROVED,
          user: {
            role: 'TUTOR',
          },
        },
      }),
      this.prisma.courseCompletion.findMany({
        where: {
          course: {
            tutor: {
              profile: {
                applicationStatus: ApplicationStatus.APPROVED,
              },
              role: 'TUTOR',
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
      }),
    ]);

    const completedCourseCountByTutor = completedCourses.reduce<
      Record<string, number>
    >((counts, completion) => {
      const tutorId = completion.course.tutorId;
      counts[tutorId] = (counts[tutorId] ?? 0) + 1;
      return counts;
    }, {});

    return {
      success: true,
      meta: {
        page: currentPage,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: profiles.map(({ user, ...profile }) => ({
        ...user,
        profile: {
          ...profile,
          completedCoursesCount: completedCourseCountByTutor[user.id] ?? 0,
        },
      })),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findTutorStudents(tutorId: string, query: TutorStudentsQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(Math.max(1, query.limit || 10), 100);
    const skip = (page - 1) * limit;
    const type = query.type ?? TutorStudentCourseTypeFilter.ALL;
    const search = query.search?.trim();
    const includeGroup =
      type === TutorStudentCourseTypeFilter.ALL ||
      type === TutorStudentCourseTypeFilter.GROUP;
    const includePrivate =
      type === TutorStudentCourseTypeFilter.ALL ||
      type === TutorStudentCourseTypeFilter.PRIVATE;

    const enrollmentFilters: Prisma.UserWhereInput[] = [];

    if (includeGroup) {
      enrollmentFilters.push({
        courseEnrollments: {
          some: {
            course: {
              tutorId,
            },
          },
        },
      });
    }

    if (includePrivate) {
      enrollmentFilters.push({
        payments: {
          some: {
            tutorId,
            type: PaymentType.PRIVATE,
            status: PaymentStatus.PAID,
          },
        },
      });
    }

    const where: Prisma.UserWhereInput = {
      role: 'STUDENT',
      ...(search && {
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
      }),
      ...(enrollmentFilters.length > 0 && {
        AND: [
          {
            OR: enrollmentFilters,
          },
        ],
      }),
    };

    const [total, students] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          fullName: 'asc',
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: {
            select: {
              avatarUrl: true,
            },
          },
          courseEnrollments: {
            where: {
              course: {
                tutorId,
              },
            },
            select: {
              id: true,
              createdAt: true,
              courseId: true,
              course: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          curriculumProgress: {
            where: {
              course: {
                tutorId,
              },
            },
            select: {
              id: true,
            },
          },
          payments: {
            where: {
              tutorId,
              type: PaymentType.PRIVATE,
              status: PaymentStatus.PAID,
            },
            select: {
              id: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const from = total === 0 ? 0 : skip + 1;
    const to = Math.min(skip + students.length, total);

    return {
      success: true,
      data: students.map((student) => {
        const groupCourseIds = new Set(
          student.courseEnrollments.map((enrollment) => enrollment.courseId),
        );
        const privateHireCount = student.payments.length;
        const joinedDates = [
          ...student.courseEnrollments.map(
            (enrollment) => enrollment.createdAt,
          ),
          ...student.payments.map((payment) => payment.createdAt),
        ];
        const activeCourses = [
          ...(student.courseEnrollments.length > 0 ? ['group'] : []),
          ...(privateHireCount > 0 ? ['private'] : []),
        ];

        return {
          studentId: student.id,
          studentName: student.fullName,
          studentEmail: student.email,
          studentImage: student.profile?.avatarUrl ?? null,
          courses: groupCourseIds.size + privateHireCount,
          lessonCompleted: student.curriculumProgress.length,
          joined: this.getEarliestDate(joinedDates),
          activeCourses,
          groupCourses: student.courseEnrollments.map((enrollment) => ({
            id: enrollment.course.id,
            title: enrollment.course.title,
            joined: enrollment.createdAt,
          })),
          privateHireCount,
        };
      }),
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
        type,
      },
    };
  }

  async findTutorStudentById(tutorId: string, studentId: string) {
    const student = await this.prisma.user.findFirst({
      where: {
        id: studentId,
        role: 'STUDENT',
        OR: [
          {
            courseEnrollments: {
              some: {
                course: {
                  tutorId,
                },
              },
            },
          },
          {
            payments: {
              some: {
                tutorId,
                type: PaymentType.PRIVATE,
                status: PaymentStatus.PAID,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        profile: {
          select: {
            avatarUrl: true,
            country: true,
            city: true,
          },
        },
        courseEnrollments: {
          where: {
            course: {
              tutorId,
            },
          },
          select: {
            id: true,
            createdAt: true,
            courseId: true,
            course: {
              select: {
                id: true,
                title: true,
                image: true,
                startDate: true,
              },
            },
          },
        },
        curriculumProgress: {
          where: {
            course: {
              tutorId,
            },
          },
          select: {
            id: true,
            courseId: true,
            curriculumIndex: true,
            completedAt: true,
          },
        },
        payments: {
          where: {
            tutorId,
            type: PaymentType.PRIVATE,
            status: PaymentStatus.PAID,
          },
          select: {
            id: true,
            amount: true,
            createdAt: true,
            status: true,
            type: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found in your roster');
    }

    const joinedDates = [
      ...student.courseEnrollments.map((enrollment) => enrollment.createdAt),
      ...student.payments.map((payment) => payment.createdAt),
    ];

    return {
      success: true,
      data: {
        studentId: student.id,
        studentName: student.fullName,
        studentEmail: student.email,
        studentImage: student.profile?.avatarUrl ?? null,
        country: student.profile?.country ?? null,
        city: student.profile?.city ?? null,
        courses: student.courseEnrollments.length + student.payments.length,
        lessonCompleted: student.curriculumProgress.length,
        joined: this.getEarliestDate(joinedDates),
        activeCourses: [
          ...(student.courseEnrollments.length > 0 ? ['group'] : []),
          ...(student.payments.length > 0 ? ['private'] : []),
        ],
        groupCourses: student.courseEnrollments.map((enrollment) => ({
          enrollmentId: enrollment.id,
          id: enrollment.course.id,
          title: enrollment.course.title,
          image: enrollment.course.image,
          startDate: enrollment.course.startDate,
          joined: enrollment.createdAt,
        })),
        completedLessons: student.curriculumProgress,
        privatePayments: student.payments.map((payment) => ({
          paymentId: payment.id,
          amount: payment.amount,
          date: payment.createdAt,
          status: payment.status.toLowerCase(),
          type: payment.type.toLowerCase(),
        })),
      },
    };
  }

  async deleteTutorStudent(tutorId: string, studentId: string) {
    const tutorCourseIds = await this.prisma.course.findMany({
      where: {
        tutorId,
        enrollments: {
          some: {
            studentId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    const courseIds = tutorCourseIds.map((course) => course.id);

    if (courseIds.length === 0) {
      throw new NotFoundException(
        'No group course enrollment found for this student in your roster',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const deletedProgress = await tx.curriculumProgress.deleteMany({
        where: {
          studentId,
          courseId: {
            in: courseIds,
          },
        },
      });

      const deletedCompletions = await tx.courseCompletion.deleteMany({
        where: {
          studentId,
          courseId: {
            in: courseIds,
          },
        },
      });

      const deletedEnrollments = await tx.courseEnrollment.deleteMany({
        where: {
          studentId,
          courseId: {
            in: courseIds,
          },
        },
      });

      return {
        deletedProgress: deletedProgress.count,
        deletedCompletions: deletedCompletions.count,
        deletedEnrollments: deletedEnrollments.count,
      };
    });

    return {
      success: true,
      message:
        'Student removed from your group courses. Private payment history was kept.',
      data: {
        studentId,
        courseIds,
        ...result,
      },
    };
  }

  async updateProfileStatus(profileId: string, status: ApplicationStatus) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException(
        `User profile with ID ${profileId} not found`,
      );
    }

    const updatedProfile = await this.prisma.userProfile.update({
      where: { id: profileId },
      data: { applicationStatus: status },
    });

    return {
      success: true,
      message: `Application status updated to ${status} successfully`,
      data: updatedProfile,
    };
  }

  private getEarliestDate(dates: Date[]) {
    if (dates.length === 0) {
      return null;
    }

    return dates.reduce((earliest, date) =>
      date < earliest ? date : earliest,
    );
  }
}
