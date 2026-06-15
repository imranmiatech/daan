import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CalendarService } from './calendar.service';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@ApiTags('Calendar')
@Controller('calendar')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.TUTOR)
@ApiBearerAuth()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('student')
  @Roles(Role.STUDENT)
  @ApiOperation({
    summary: 'Get student monthly calendar and upcoming lessons',
  })
  @ApiResponse({
    status: 200,
    description: 'Student calendar retrieved.',
    schema: {
      example: {
        success: true,
        data: {
          month: '2026-05',
          year: 2026,
          monthNumber: 5,
          timezone: 'Asia/Dhaka',
          summary: {
            thisWeek: {
              lessonsScheduled: 4,
              label: '4 Lessons scheduled',
            },
            thisMonth: {
              lessonsScheduled: 12,
              label: '12 Lessons scheduled',
            },
            totalHours: {
              hours: 28,
              label: 'This month',
            },
            nextLesson: {
              id: 'course_javascript_advanced:1',
              courseId: 'course_javascript_advanced',
              title: 'JavaScript Advanced',
              lessonTitle: 'Async JavaScript Patterns',
              tutorName: 'Michael Brown',
              startsAt: '2026-05-12T15:00:00.000Z',
              time: '3:00 pm',
              date: '2026-05-12',
              label: 'Today',
            },
          },
          events: [
            {
              id: 'course_javascript_advanced:1',
              type: 'GROUP_CLASS',
              title: 'Async JavaScript Patterns',
              courseTitle: 'JavaScript Advanced',
              courseId: 'course_javascript_advanced',
              curriculumIndex: 1,
              tutor: {
                id: 'tutor_01',
                name: 'Michael Brown',
                avatarUrl: 'https://example.com/avatars/michael-brown.jpg',
              },
              date: '2026-05-12',
              startsAt: '2026-05-12T15:00:00.000Z',
              endsAt: '2026-05-12T16:30:00.000Z',
              startTime: '3:00 pm',
              endTime: '16:30',
              timezone: 'Asia/Dhaka',
              durationMinutes: 90,
              durationHours: 1.5,
              status: 'upcoming',
              cancellationReason: null,
              joinAvailable: true,
            },
          ],
          upcomingSessions: [
            {
              id: 'course_javascript_advanced:1',
              courseId: 'course_javascript_advanced',
              curriculumIndex: 1,
              title: 'JavaScript Advanced',
              lessonTitle: 'Async JavaScript Patterns',
              tutorName: 'Michael Brown',
              tutorAvatarUrl: 'https://example.com/avatars/michael-brown.jpg',
              date: '2026-05-12',
              startsAt: '2026-05-12T15:00:00.000Z',
              timeLabel: '3:00 pm',
              status: 'upcoming',
              joinAvailable: true,
            },
          ],
        },
      },
    },
  })
  getStudentCalendar(
    @CurrentUser() user: { userId: string },
    @Query() query: CalendarQueryDto,
  ) {
    return this.calendarService.getStudentCalendar(user.userId, query);
  }

  @Get('tutor')
  @ApiOperation({ summary: 'Get tutor monthly calendar and availability' })
  @ApiResponse({ status: 200, description: 'Calendar retrieved.' })
  getTutorCalendar(
    @CurrentUser() user: { userId: string },
    @Query() query: CalendarQueryDto,
  ) {
    return this.calendarService.getTutorCalendar(user.userId, query);
  }

  @Patch('availability')
  @ApiOperation({ summary: 'Update tutor weekly availability' })
  @ApiResponse({ status: 200, description: 'Availability updated.' })
  updateAvailability(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.calendarService.updateAvailability(user.userId, dto);
  }
}
