import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApplicationStatus } from '@prisma/client';

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
}
