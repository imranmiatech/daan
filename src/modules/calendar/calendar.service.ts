import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

type CalendarEventStatus = 'cancelled' | 'completed' | 'live' | 'upcoming';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentCalendar(studentId: string, query: CalendarQueryDto) {
    await this.assertStudent(studentId);

    const currentDate = new Date();
    const month = query.month ?? currentDate.getMonth() + 1;
    const year = query.year ?? currentDate.getFullYear();

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            tutor: {
              select: {
                id: true,
                fullName: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
            lessonStates: {
              where: { studentId },
              select: {
                curriculumIndex: true,
                status: true,
                reason: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const events = enrollments
      .flatMap((enrollment) => {
        const course = enrollment.course;
        const lessonTitles = course.curriculums.length
          ? course.curriculums
          : [course.title];
        const stateByIndex = new Map(
          course.lessonStates.map((state) => [state.curriculumIndex, state]),
        );

        return lessonTitles.map((lessonTitle, index) => {
          const date = new Date(course.startDate);
          date.setDate(date.getDate() + index);

          const startsAt = this.combineDateAndTime(date, course.time);
          const endsAt = new Date(
            startsAt.getTime() + course.classDuration * 60 * 1000,
          );
          const state = stateByIndex.get(index);
          const status =
            state?.status === 'cancelled'
              ? 'cancelled'
              : this.getEventStatus(startsAt, endsAt);

          return {
            id: `${course.id}:${index}`,
            type: course.maxStudent > 1 ? 'GROUP_CLASS' : 'PRIVATE_CLASS',
            title: lessonTitle,
            courseTitle: course.title,
            courseId: course.id,
            curriculumIndex: index,
            tutor: {
              id: course.tutor.id,
              name: course.tutor.fullName,
              avatarUrl: course.tutor.profile?.avatarUrl ?? null,
            },
            date: this.formatIsoDate(date),
            startsAt,
            endsAt,
            startTime: course.time,
            endTime: this.formatClockTime(endsAt),
            timezone: course.timeZone,
            durationMinutes: course.classDuration,
            durationHours: Number((course.classDuration / 60).toFixed(2)),
            status,
            cancellationReason: state?.reason ?? null,
            joinAvailable: status === 'live' || status === 'upcoming',
          };
        });
      })
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    const monthEvents = events.filter((event) => {
      const eventDate = new Date(`${event.date}T00:00:00`);
      return (
        eventDate.getFullYear() === year && eventDate.getMonth() + 1 === month
      );
    });
    const activeMonthEvents = monthEvents.filter(
      (event) => event.status !== 'cancelled',
    );
    const thisWeekEvents = events.filter(
      (event) =>
        event.status !== 'cancelled' &&
        this.isSameWeek(event.startsAt, currentDate),
    );
    const nextLesson =
      events.find((event) => ['live', 'upcoming'].includes(event.status)) ??
      null;

    return {
      success: true,
      data: {
        month: `${year}-${String(month).padStart(2, '0')}`,
        year,
        monthNumber: month,
        timezone: query.timezone ?? enrollments[0]?.course.timeZone ?? null,
        summary: {
          thisWeek: {
            lessonsScheduled: thisWeekEvents.length,
            label: `${thisWeekEvents.length} Lessons scheduled`,
          },
          thisMonth: {
            lessonsScheduled: activeMonthEvents.length,
            label: `${activeMonthEvents.length} Lessons scheduled`,
          },
          totalHours: {
            hours: Number(
              (
                activeMonthEvents.reduce(
                  (total, event) => total + event.durationMinutes,
                  0,
                ) / 60
              ).toFixed(2),
            ),
            label: 'This month',
          },
          nextLesson: nextLesson
            ? {
                id: nextLesson.id,
                courseId: nextLesson.courseId,
                title: nextLesson.courseTitle,
                lessonTitle: nextLesson.title,
                tutorName: nextLesson.tutor.name,
                startsAt: nextLesson.startsAt,
                time: nextLesson.startTime,
                date: nextLesson.date,
                label: this.isSameDay(nextLesson.startsAt, currentDate)
                  ? 'Today'
                  : nextLesson.date,
              }
            : null,
        },
        events: monthEvents,
        upcomingSessions: events
          .filter((event) => ['live', 'upcoming'].includes(event.status))
          .slice(0, 5)
          .map((event) => ({
            id: event.id,
            courseId: event.courseId,
            curriculumIndex: event.curriculumIndex,
            title: event.courseTitle,
            lessonTitle: event.title,
            tutorName: event.tutor.name,
            tutorAvatarUrl: event.tutor.avatarUrl,
            date: event.date,
            startsAt: event.startsAt,
            timeLabel: `${event.startTime}`,
            status: event.status,
            joinAvailable: event.joinAvailable,
          })),
      },
    };
  }

  async getTutorCalendar(tutorId: string, query: CalendarQueryDto) {
    const currentDate = new Date();
    const month = query.month ?? currentDate.getMonth() + 1;
    const year = query.year ?? currentDate.getFullYear();

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: tutorId },
      include: {
        availability: {
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Tutor profile not found');
    }

    const courses = await this.prisma.course.findMany({
      where: { tutorId },
      select: {
        id: true,
        title: true,
        curriculums: true,
        startDate: true,
        time: true,
        timeZone: true,
        classDuration: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    const events = courses.flatMap((course) =>
      course.curriculums.map((lessonTitle, index) => {
        const date = new Date(course.startDate);
        date.setDate(date.getDate() + index);

        const startsAt = this.combineDateAndTime(date, course.time);
        const endsAt = new Date(
          startsAt.getTime() + course.classDuration * 60 * 1000,
        );

        return {
          id: `${course.id}-${index}`,
          type: 'GROUP_CLASS',
          title: lessonTitle,
          courseTitle: course.title,
          courseId: course.id,
          date: this.formatIsoDate(date),
          startTime: course.time,
          endTime: this.formatClockTime(endsAt),
          timezone: course.timeZone,
          status: this.getEventStatus(startsAt, endsAt),
        };
      }),
    );

    const monthEvents = events.filter((event) => {
      const eventDate = new Date(`${event.date}T00:00:00`);
      return (
        eventDate.getFullYear() === year && eventDate.getMonth() + 1 === month
      );
    });

    return {
      success: true,
      data: {
        month: `${year}-${String(month).padStart(2, '0')}`,
        year,
        monthNumber: month,
        timezone:
          query.timezone ??
          profile.availability.find((item) => item.timezone)?.timezone ??
          null,
        events: monthEvents,
        availability: profile.availability,
      },
    };
  }

  async updateAvailability(tutorId: string, dto: UpdateAvailabilityDto) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: tutorId },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Tutor profile not found');
    }

    dto.availability.forEach((item) => {
      const start = this.parseTime(item.startTime);
      const end = this.parseTime(item.endTime);

      if (!start || !end) {
        throw new BadRequestException(
          'Availability time must be in HH:mm or h:mm am/pm format',
        );
      }

      if (start.totalMinutes >= end.totalMinutes) {
        throw new BadRequestException(
          'Availability startTime must be before endTime',
        );
      }
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({
        where: { profileId: profile.id },
      });

      if (dto.availability.length > 0) {
        await tx.availability.createMany({
          data: dto.availability.map((item) => ({
            profileId: profile.id,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            timezone: item.timezone,
          })),
        });
      }
    });

    const availability = await this.prisma.availability.findMany({
      where: { profileId: profile.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return {
      success: true,
      message: 'Availability updated successfully',
      data: availability,
    };
  }

  private async assertStudent(studentId: string) {
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
      throw new ForbiddenException('Only students can access this calendar');
    }
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

    return {
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
    };
  }

  private getEventStatus(startsAt: Date, endsAt: Date): CalendarEventStatus {
    const now = new Date();

    if (now >= startsAt && now <= endsAt) {
      return 'live';
    }

    if (now > endsAt) {
      return 'completed';
    }

    return 'upcoming';
  }

  private formatIsoDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatClockTime(date: Date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  private isSameWeek(date: Date, compareDate: Date) {
    const weekStart = new Date(compareDate);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return date >= weekStart && date < weekEnd;
  }

  private isSameDay(date: Date, compareDate: Date) {
    return (
      date.getFullYear() === compareDate.getFullYear() &&
      date.getMonth() === compareDate.getMonth() &&
      date.getDate() === compareDate.getDate()
    );
  }
}
