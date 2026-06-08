import { Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProfileDto } from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const [profile, completedCourses] = await this.prisma.$transaction([
      this.prisma.userProfile.findUnique({
        where: { userId },
        include: {
          education: true,
          availability: true,
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.courseCompletion.findMany({
        where: {
          course: {
            tutorId: userId,
          },
        },
        distinct: ['courseId'],
        select: {
          courseId: true,
        },
      }),
    ]);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return {
      ...profile,
      completedCoursesCount: completedCourses.length,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const {
      fullName,
      country,
      city,
      avatarUrl,
      bio,
      yearOfExperience,
      pricePerHour,
      languageExpertise,
      aboutMe,
      teachingCategory,
      teachingSkills,
      sessionDuration,
      videoUrl,
      education,
      availability,
    } = dto;

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    if (fullName !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { fullName },
      });
    }

    if (education !== undefined) {
      await this.prisma.education.deleteMany({
        where: { profileId: profile.id },
      });
      if (education && education.length > 0) {
        await this.prisma.education.createMany({
          data: education.map((e) => ({
            profileId: profile.id,
            institution: e.institution,
            country: e.country,
            city: e.city,
            degree: e.degree,
            passingYear: e.passingYear,
          })),
        });
      }
    }

    if (availability !== undefined) {
      await this.prisma.availability.deleteMany({
        where: { profileId: profile.id },
      });
      if (availability && availability.length > 0) {
        await this.prisma.availability.createMany({
          data: availability.map((a) => ({
            profileId: profile.id,
            dayOfWeek: a.dayOfWeek!,
            startTime: a.startTime!,
            endTime: a.endTime!,
          })),
        });
      }
    }

    return this.prisma.userProfile.update({
      where: { userId },
      data: {
        country,
        city,
        avatarUrl,
        bio,
        yearOfExperience,
        pricePerHour,
        languageExpertise,
        aboutMe,
        teachingCategory,
        teachingSkills,
        sessionDuration,
        videoUrl,
      },
      include: {
        education: true,
        availability: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    });
  }

  async updateApplicationStatus(profileId: string, status: ApplicationStatus) {
    const profile = await this.prisma.userProfile.findUnique({
      where: {
        id: profileId,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.prisma.userProfile.update({
      where: {
        id: profileId,
      },
      data: {
        applicationStatus: status,
      },
    });
  }
  async getTutorAvailability(tutorId: string, courseId?: string) {
  // Support passing either a userId (users.id) or a profile id
  let profile = await this.prisma.userProfile.findUnique({
    where: { userId: tutorId },
  });

  if (!profile) {
    profile = await this.prisma.userProfile.findUnique({
      where: { id: tutorId },
    });
  }

  if (!profile) {
    throw new NotFoundException('Tutor profile not found');
  }

  const availabilities = await this.prisma.availability.findMany({
    where: {
      profileId: profile.id,
    },
    orderBy: {
      dayOfWeek: 'asc',
    },
  });

  if (courseId) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { timeZone: true },
    });

    if (course && course.timeZone) {
      return availabilities.map((a) => ({
        ...a,
        timezone: (a as any).timezone ?? course.timeZone,
      }));
    }
  }

  return availabilities;
}
}
