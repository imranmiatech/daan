import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, PaymentType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

type DashboardLesson = {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  date: Date;
  time: string;
  status: 'completed' | 'live' | 'upcoming';
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getTutorHome(tutorId: string) {
    const now = new Date();
    const todayStart = this.startOfDay(now);
    const tomorrowStart = this.addDays(todayStart, 1);
    const weekStart = this.startOfWeek(now);
    const nextWeekStart = this.addDays(weekStart, 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const tutor = await this.prisma.user.findUnique({
      where: { id: tutorId },
      select: {
        id: true,
        fullName: true,
        profile: {
          select: {
            avatarUrl: true,
            id: true,
          },
        },
      },
    });

    if (!tutor) {
      throw new NotFoundException('Tutor not found');
    }

    const [
      courses,
      weeklyRevenue,
      previousWeekRevenue,
      revenueRows,
      totalStudents,
      previousMonthStudents,
      recentNotifications,
      recentPayments,
      recentReviews,
    ] = await Promise.all([
      this.prisma.course.findMany({
        where: { tutorId },
        select: {
          id: true,
          title: true,
          curriculums: true,
          startDate: true,
          time: true,
          classDuration: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          tutorId,
          status: PaymentStatus.PAID,
          createdAt: {
            gte: weekStart,
            lt: nextWeekStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          tutorId,
          status: PaymentStatus.PAID,
          createdAt: {
            gte: this.addDays(weekStart, -7),
            lt: weekStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          tutorId,
          status: PaymentStatus.PAID,
          createdAt: {
            gte: yearStart,
            lt: nextMonthStart,
          },
        },
        select: {
          amount: true,
          createdAt: true,
        },
      }),
      this.getTotalTutorStudents(tutorId),
      this.getTotalTutorStudents(tutorId, {
        lt: monthStart,
      }),
      this.prisma.notification.findMany({
        where: { userId: tutorId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          createdAt: true,
          targetUrl: true,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          tutorId,
          status: PaymentStatus.PAID,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: {
            select: {
              fullName: true,
            },
          },
          course: {
            select: {
              title: true,
            },
          },
        },
      }),
      tutor.profile?.id
        ? this.prisma.review.findMany({
            where: {
              tutorProfileId: tutor.profile.id,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              reviewer: {
                select: {
                  fullName: true,
                },
              },
            },
          })
        : [],
    ]);

    const lessons = courses.flatMap((course) =>
      this.buildCourseLessons(course, now),
    );
    const todayLessons = lessons.filter(
      (lesson) => lesson.date >= todayStart && lesson.date < tomorrowStart,
    );
    const upcomingLessons = lessons
      .filter(
        (lesson) => lesson.status === 'live' || lesson.status === 'upcoming',
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 3);

    const weeklyAmount = weeklyRevenue._sum.amount ?? 0;
    const previousWeeklyAmount = previousWeekRevenue._sum.amount ?? 0;

    return {
      success: true,
      data: {
        welcome: {
          tutorId: tutor.id,
          name: tutor.fullName,
          image: tutor.profile?.avatarUrl ?? null,
        },
        cards: {
          todaysLessons: {
            count: todayLessons.length,
            changeFromYesterday: this.getLessonChangeFromYesterday(
              lessons,
              todayStart,
            ),
          },
          weeklyRevenue: {
            amount: weeklyAmount,
            changePercentage: this.calculateChangePercentage(
              weeklyAmount,
              previousWeeklyAmount,
            ),
          },
          activeCourses: {
            count: this.getActiveCourseCount(lessons),
          },
          totalStudents: {
            count: totalStudents,
            changeThisMonth: Math.max(0, totalStudents - previousMonthStudents),
          },
        },
        upcomingLessons: upcomingLessons.map((lesson) =>
          this.mapLesson(lesson),
        ),
        weeklyLessons: this.buildWeeklyLessons(lessons, weekStart),
        revenueOverview: {
          period: `${yearStart.toLocaleString('en-US', { month: 'short' })}-${now.toLocaleString('en-US', { month: 'short' })} ${now.getFullYear()}`,
          data: this.buildMonthlyRevenueOverview(revenueRows, now),
        },
        recentActivity: this.buildRecentActivity(
          recentNotifications,
          recentPayments,
          recentReviews,
        ),
      },
    };
  }

  async getTutorWelcome(tutorId: string) {
    const tutor = await this.getTutorProfile(tutorId);

    return {
      success: true,
      data: {
        tutorId: tutor.id,
        name: tutor.fullName,
        image: tutor.profile?.avatarUrl ?? null,
      },
    };
  }

  async getTutorCards(tutorId: string) {
    const now = new Date();
    const todayStart = this.startOfDay(now);
    const weekStart = this.startOfWeek(now);
    const nextWeekStart = this.addDays(weekStart, 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const courses = await this.getTutorCourses(tutorId);
    const lessons = courses.flatMap((course) =>
      this.buildCourseLessons(course, now),
    );

    const [
      weeklyRevenue,
      previousWeekRevenue,
      totalStudents,
      previousStudents,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          tutorId,
          status: PaymentStatus.PAID,
          createdAt: {
            gte: weekStart,
            lt: nextWeekStart,
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          tutorId,
          status: PaymentStatus.PAID,
          createdAt: {
            gte: this.addDays(weekStart, -7),
            lt: weekStart,
          },
        },
        _sum: { amount: true },
      }),
      this.getTotalTutorStudents(tutorId),
      this.getTotalTutorStudents(tutorId, { lt: monthStart }),
    ]);

    const weeklyAmount = weeklyRevenue._sum.amount ?? 0;
    const previousWeeklyAmount = previousWeekRevenue._sum.amount ?? 0;

    return {
      success: true,
      data: {
        todaysLessons: {
          count: lessons.filter(
            (lesson) =>
              lesson.date >= todayStart &&
              lesson.date < this.addDays(todayStart, 1),
          ).length,
          changeFromYesterday: this.getLessonChangeFromYesterday(
            lessons,
            todayStart,
          ),
        },
        weeklyRevenue: {
          amount: weeklyAmount,
          changePercentage: this.calculateChangePercentage(
            weeklyAmount,
            previousWeeklyAmount,
          ),
        },
        activeCourses: {
          count: this.getActiveCourseCount(lessons),
        },
        totalStudents: {
          count: totalStudents,
          changeThisMonth: Math.max(0, totalStudents - previousStudents),
        },
      },
    };
  }

  async getTutorUpcomingLessons(tutorId: string) {
    const now = new Date();
    const courses = await this.getTutorCourses(tutorId);
    const lessons = courses
      .flatMap((course) => this.buildCourseLessons(course, now))
      .filter(
        (lesson) => lesson.status === 'live' || lesson.status === 'upcoming',
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);

    return {
      success: true,
      data: lessons.map((lesson) => this.mapLesson(lesson)),
    };
  }

  async getTutorWeeklyLessons(tutorId: string) {
    const now = new Date();
    const weekStart = this.startOfWeek(now);
    const courses = await this.getTutorCourses(tutorId);
    const lessons = courses.flatMap((course) =>
      this.buildCourseLessons(course, now),
    );

    return {
      success: true,
      data: this.buildWeeklyLessons(lessons, weekStart),
    };
  }

  async getTutorRevenueOverview(tutorId: string) {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const revenueRows = await this.prisma.payment.findMany({
      where: {
        tutorId,
        status: PaymentStatus.PAID,
        createdAt: {
          gte: yearStart,
          lt: nextMonthStart,
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: {
        period: `${yearStart.toLocaleString('en-US', { month: 'short' })}-${now.toLocaleString('en-US', { month: 'short' })} ${now.getFullYear()}`,
        data: this.buildMonthlyRevenueOverview(revenueRows, now),
      },
    };
  }

  async getTutorRecentActivity(tutorId: string) {
    const tutor = await this.getTutorProfile(tutorId);
    const [recentNotifications, recentPayments, recentReviews] =
      await Promise.all([
        this.prisma.notification.findMany({
          where: { userId: tutorId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            type: true,
            title: true,
            body: true,
            createdAt: true,
            targetUrl: true,
          },
        }),
        this.prisma.payment.findMany({
          where: {
            tutorId,
            status: PaymentStatus.PAID,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            user: {
              select: {
                fullName: true,
              },
            },
            course: {
              select: {
                title: true,
              },
            },
          },
        }),
        tutor.profile?.id
          ? this.prisma.review.findMany({
              where: {
                tutorProfileId: tutor.profile.id,
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
              include: {
                reviewer: {
                  select: {
                    fullName: true,
                  },
                },
              },
            })
          : [],
      ]);

    return {
      success: true,
      data: this.buildRecentActivity(
        recentNotifications,
        recentPayments,
        recentReviews,
      ),
    };
  }

  private async getTotalTutorStudents(
    tutorId: string,
    createdAt?: Prisma.DateTimeFilter,
  ) {
    const [groupStudents, privateStudents] = await Promise.all([
      this.prisma.courseEnrollment.findMany({
        where: {
          ...(createdAt && { createdAt }),
          course: {
            tutorId,
          },
        },
        distinct: ['studentId'],
        select: {
          studentId: true,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          tutorId,
          type: PaymentType.PRIVATE,
          status: PaymentStatus.PAID,
          ...(createdAt && { createdAt }),
        },
        distinct: ['userId'],
        select: {
          userId: true,
        },
      }),
    ]);

    return new Set([
      ...groupStudents.map((student) => student.studentId),
      ...privateStudents.map((student) => student.userId),
    ]).size;
  }

  private async getTutorProfile(tutorId: string) {
    const tutor = await this.prisma.user.findUnique({
      where: { id: tutorId },
      select: {
        id: true,
        fullName: true,
        profile: {
          select: {
            id: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!tutor) {
      throw new NotFoundException('Tutor not found');
    }

    return tutor;
  }

  private async getTutorCourses(tutorId: string) {
    return this.prisma.course.findMany({
      where: { tutorId },
      select: {
        id: true,
        title: true,
        curriculums: true,
        startDate: true,
        time: true,
        classDuration: true,
      },
    });
  }

  private buildCourseLessons(
    course: {
      id: string;
      title: string;
      curriculums: string[];
      startDate: Date;
      time: string;
      classDuration: number;
    },
    now: Date,
  ): DashboardLesson[] {
    return course.curriculums.map((title, index) => {
      const date = new Date(course.startDate);
      date.setDate(date.getDate() + index);
      const lessonDate = this.combineDateAndTime(date, course.time);

      return {
        id: `${course.id}-${index}`,
        courseId: course.id,
        courseTitle: course.title,
        title,
        date: lessonDate,
        time: course.time,
        status: this.getLessonStatus(lessonDate, course.classDuration, now),
      };
    });
  }

  private buildWeeklyLessons(lessons: DashboardLesson[], weekStart: Date) {
    return Array.from({ length: 7 }, (_, index) => {
      const dayStart = this.addDays(weekStart, index);
      const dayEnd = this.addDays(dayStart, 1);
      const dayLessons = lessons.filter(
        (lesson) => lesson.date >= dayStart && lesson.date < dayEnd,
      );

      return {
        day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        private: 0,
        group: dayLessons.length,
        total: dayLessons.length,
      };
    });
  }

  private buildMonthlyRevenueOverview(
    payments: { amount: number; createdAt: Date }[],
    now: Date,
  ) {
    const monthCount = now.getMonth() + 1;
    const totals = Array.from({ length: monthCount }, (_, monthIndex) => ({
      month: new Date(now.getFullYear(), monthIndex, 1).toLocaleString(
        'en-US',
        { month: 'short' },
      ),
      amount: 0,
    }));

    for (const payment of payments) {
      if (payment.createdAt.getFullYear() === now.getFullYear()) {
        totals[payment.createdAt.getMonth()].amount += payment.amount;
      }
    }

    return totals;
  }

  private buildRecentActivity(
    notifications: {
      id: string;
      type: string;
      title: string;
      body: string | null;
      createdAt: Date;
      targetUrl: string | null;
    }[],
    payments: {
      id: string;
      amount: number;
      createdAt: Date;
      type: PaymentType;
      user: { fullName: string };
      course: { title: string } | null;
    }[],
    reviews: {
      id: string;
      rating: number;
      createdAt: Date;
      reviewer: { fullName: string };
    }[],
  ) {
    const activity = [
      ...notifications.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.body,
        createdAt: item.createdAt,
        targetUrl: item.targetUrl,
      })),
      ...payments.map((payment) => ({
        id: payment.id,
        type: 'BOOKED_LESSON',
        title:
          payment.type === PaymentType.PRIVATE
            ? 'Booked lesson'
            : 'Course enrollment',
        description:
          payment.type === PaymentType.PRIVATE
            ? `${payment.user.fullName} booked a private lesson`
            : `${payment.user.fullName} enrolled in ${payment.course?.title ?? 'a course'}`,
        createdAt: payment.createdAt,
        targetUrl: null,
      })),
      ...reviews.map((review) => ({
        id: review.id,
        type: 'REVIEW',
        title: 'Left a review',
        description: `${review.reviewer.fullName} left ${review.rating} stars`,
        createdAt: review.createdAt,
        targetUrl: null,
      })),
    ];

    return activity
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((item) => ({
        ...item,
        timeAgo: this.formatTimeAgo(item.createdAt),
      }));
  }

  private mapLesson(lesson: DashboardLesson) {
    return {
      id: lesson.id,
      courseId: lesson.courseId,
      courseTitle: lesson.courseTitle,
      title: lesson.title,
      date: lesson.date,
      time: lesson.time,
      status: lesson.status,
    };
  }

  private getActiveCourseCount(lessons: DashboardLesson[]) {
    return new Set(
      lessons
        .filter(
          (lesson) => lesson.status === 'live' || lesson.status === 'upcoming',
        )
        .map((lesson) => lesson.courseId),
    ).size;
  }

  private getLessonChangeFromYesterday(
    lessons: DashboardLesson[],
    today: Date,
  ) {
    const yesterday = this.addDays(today, -1);
    const todayCount = lessons.filter(
      (lesson) => lesson.date >= today && lesson.date < this.addDays(today, 1),
    ).length;
    const yesterdayCount = lessons.filter(
      (lesson) => lesson.date >= yesterday && lesson.date < today,
    ).length;

    return todayCount - yesterdayCount;
  }

  private calculateChangePercentage(current: number, previous: number) {
    if (previous <= 0) {
      return current > 0 ? 100 : 0;
    }

    return Math.round(((current - previous) / previous) * 100);
  }

  private getLessonStatus(
    lessonDate: Date,
    durationMinutes: number,
    now: Date,
  ): 'completed' | 'live' | 'upcoming' {
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

  private startOfDay(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private startOfWeek(date: Date) {
    const start = this.startOfDay(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return this.addDays(start, diff);
  }

  private addDays(date: Date, days: number) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  }

  private formatTimeAgo(date: Date) {
    const seconds = Math.max(
      1,
      Math.floor((Date.now() - date.getTime()) / 1000),
    );
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} d ago`;
    }

    if (hours > 0) {
      return `${hours} h ago`;
    }

    if (minutes > 0) {
      return `${minutes} min ago`;
    }

    return 'just now';
  }
}
