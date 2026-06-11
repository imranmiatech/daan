import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ApplicationStatus,
  PaymentStatus,
  PayoutStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TutorStatusFilter } from './dto/tutor-status-query.dto';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getHome() {
    const [cards, revenueOverview, userJoining] = await Promise.all([
      this.buildCards(),
      this.buildRevenueOverview(),
      this.buildUserJoining(),
    ]);

    return {
      success: true,
      data: {
        title: 'Dashboard Overview',
        subtitle:
          "Welcome back! Here's what's happening with your platform today.",
        cards,
        revenueOverview,
        userJoining,
      },
    };
  }

  async getCards() {
    return {
      success: true,
      data: await this.buildCards(),
    };
  }

  async getUsersByRole(role: Role) {
    const users = await this.prisma.user.findMany({
      where: {
        role,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: this.userListSelect(),
    });

    return {
      success: true,
      data: users,
    };
  }

  async getTutors(status: TutorStatusFilter = 'all') {
    const where: Prisma.UserWhereInput = {
      role: Role.TUTOR,
      ...(status !== 'all' && {
        profile: {
          applicationStatus: status,
        },
      }),
    };

    const users = await this.prisma.user.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      select: this.userListSelect(),
    });

    return {
      success: true,
      filters: {
        status,
      },
      data: users,
    };
  }

  async getTutorApplications() {
    const users = await this.prisma.user.findMany({
      where: {
        role: Role.TUTOR,
        profile: {
          applicationStatus: {
            in: [ApplicationStatus.PENDING, ApplicationStatus.REJECTED],
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            id: true,
            avatarUrl: true,
            country: true,
            city: true,
            teachingCategory: true,
            yearOfExperience: true,
            pricePerHour: true,
            applicationStatus: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return {
      success: true,
      data: users.map((user) => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: user.profile,
      })),
    };
  }

  async getProfileById(profileId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: {
        id: profileId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isEmailVerified: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        education: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        availability: {
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return {
      success: true,
      data: profile,
    };
  }

  async updateTutorApplicationStatus(
    profileId: string,
    status: ApplicationStatus,
  ) {
    const profile = await this.prisma.userProfile.findFirst({
      where: {
        id: profileId,
        user: {
          role: Role.TUTOR,
        },
      },
      select: {
        id: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Tutor profile not found');
    }

    const updatedProfile = await this.prisma.userProfile.update({
      where: {
        id: profileId,
      },
      data: {
        applicationStatus: status,
      },
      select: {
        id: true,
        avatarUrl: true,
        country: true,
        city: true,
        teachingCategory: true,
        yearOfExperience: true,
        pricePerHour: true,
        applicationStatus: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return {
      success: true,
      message: `Tutor application status updated to ${status} successfully`,
      data: {
        id: updatedProfile.user.id,
        fullName: updatedProfile.user.fullName,
        email: updatedProfile.user.email,
        role: updatedProfile.user.role,
        profile: {
          id: updatedProfile.id,
          avatarUrl: updatedProfile.avatarUrl,
          country: updatedProfile.country,
          city: updatedProfile.city,
          teachingCategory: updatedProfile.teachingCategory,
          yearOfExperience: updatedProfile.yearOfExperience,
          pricePerHour: updatedProfile.pricePerHour,
          applicationStatus: updatedProfile.applicationStatus,
          createdAt: updatedProfile.createdAt,
          updatedAt: updatedProfile.updatedAt,
        },
      },
    };
  }

  async getRevenueOverview() {
    return {
      success: true,
      data: await this.buildRevenueOverview(),
    };
  }

  async getUserJoining() {
    return {
      success: true,
      data: await this.buildUserJoining(),
    };
  }

  private userListSelect() {
    return {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
      profile: {
        select: {
          id: true,
          avatarUrl: true,
          country: true,
          city: true,
          teachingCategory: true,
          yearOfExperience: true,
          pricePerHour: true,
          applicationStatus: true,
          averageRating: true,
          totalReviews: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    };
  }

  private async buildCards() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    const [
      totalUsers,
      previousMonthUsers,
      activeStudents,
      activeTeachers,
      pendingTeacher,
      activeCourses,
      activeGroup,
      paidRevenue,
      previousMonthRevenue,
      pendingPayouts,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          createdAt: {
            lt: monthStart,
          },
        },
      }),
      this.prisma.user.count({
        where: {
          role: Role.STUDENT,
        },
      }),
      this.prisma.user.count({
        where: {
          role: Role.TUTOR,
        },
      }),
      this.prisma.userProfile.count({
        where: {
          applicationStatus: ApplicationStatus.PENDING,
        },
      }),
      this.prisma.course.count({
        where: {
          enrollmentDeadline: {
            gte: now,
          },
        },
      }),
      this.prisma.course.count({
        where: {
          enrollmentDeadline: {
            gte: now,
          },
          maxStudent: {
            gt: 1,
          },
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          createdAt: {
            gte: previousMonthStart,
            lt: monthStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          payoutStatus: PayoutStatus.PENDING,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalRevenue = paidRevenue._sum.amount ?? 0;
    const lastMonthRevenue = previousMonthRevenue._sum.amount ?? 0;
    const pendingPayoutAmount = pendingPayouts._sum.amount ?? 0;

    return {
      totalRevenue: {
        amount: totalRevenue,
        changePercentage: this.calculateChangePercentage(
          totalRevenue,
          lastMonthRevenue,
        ),
      },
      totalUser: {
        count: totalUsers,
        changeThisMonth: Math.max(0, totalUsers - previousMonthUsers),
      },
      activeStudents: {
        count: activeStudents,
      },
      activeTeacher: {
        count: activeTeachers,
      },
      pendingTeacher: {
        count: pendingTeacher,
      },
      activeCourses: {
        count: activeCourses,
      },
      pendingPayouts: {
        amount: pendingPayoutAmount,
      },
      activeGroup: {
        count: activeGroup,
      },
      items: [
        {
          key: 'totalRevenue',
          label: 'Total Revenue',
          value: totalRevenue,
          valueType: 'currency',
        },
        {
          key: 'totalUser',
          label: 'Total User',
          value: totalUsers,
          valueType: 'number',
        },
        {
          key: 'activeStudents',
          label: 'Active Students',
          value: activeStudents,
          valueType: 'number',
        },
        {
          key: 'activeTeacher',
          label: 'Active Teacher',
          value: activeTeachers,
          valueType: 'number',
        },
        {
          key: 'pendingTeacher',
          label: 'Pending teacher',
          value: pendingTeacher,
          valueType: 'number',
        },
        {
          key: 'activeCourses',
          label: 'Active Courses',
          value: activeCourses,
          valueType: 'number',
        },
        {
          key: 'pendingPayouts',
          label: 'Pending Payouts',
          value: pendingPayoutAmount,
          valueType: 'currency',
        },
        {
          key: 'activeGroup',
          label: 'Active Group',
          value: activeGroup,
          valueType: 'number',
        },
      ],
    };
  }

  private async buildRevenueOverview() {
    const { startDate, endDate, period, startMonth, year } =
      this.getCurrentHalfYearRange();

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    return {
      period,
      total: payments.reduce((sum, payment) => sum + payment.amount, 0),
      data: this.buildMonthSeries(year, startMonth).map(
        ({ month, monthIndex }) => {
          const revenue = payments
            .filter((payment) => payment.createdAt.getMonth() === monthIndex)
            .reduce((sum, payment) => sum + payment.amount, 0);

          return {
            month,
            revenue,
          };
        },
      ),
    };
  }

  private async buildUserJoining() {
    const { startDate, endDate, period, startMonth, year } =
      this.getCurrentHalfYearRange();

    const users = await this.prisma.user.findMany({
      where: {
        role: {
          in: [Role.STUDENT, Role.TUTOR],
        },
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        role: true,
        createdAt: true,
      },
    });

    return {
      period,
      data: this.buildMonthSeries(year, startMonth).map(
        ({ month, monthIndex }) => ({
          month,
          teacher: users.filter(
            (user) =>
              user.role === Role.TUTOR &&
              user.createdAt.getMonth() === monthIndex,
          ).length,
          student: users.filter(
            (user) =>
              user.role === Role.STUDENT &&
              user.createdAt.getMonth() === monthIndex,
          ).length,
        }),
      ),
    };
  }

  private getCurrentHalfYearRange() {
    const now = new Date();
    const year = now.getFullYear();
    const startMonth = now.getMonth() < 6 ? 0 : 6;
    const endMonth = startMonth + 6;
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, endMonth, 1);
    const endLabelDate = new Date(year, endMonth - 1, 1);

    return {
      startDate,
      endDate,
      startMonth,
      year,
      period: `${startDate.toLocaleString('en-US', { month: 'short' })}-${endLabelDate.toLocaleString('en-US', { month: 'short' })} ${year}`,
    };
  }

  private buildMonthSeries(year: number, startMonth: number) {
    return Array.from({ length: 6 }, (_, index) => {
      const monthIndex = startMonth + index;
      const date = new Date(year, monthIndex, 1);

      return {
        month: date.toLocaleString('en-US', { month: 'short' }),
        monthIndex,
      };
    });
  }

  private calculateChangePercentage(current: number, previous: number) {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return Number((((current - previous) / previous) * 100).toFixed(2));
  }
}
