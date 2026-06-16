import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminDashboardService } from './admindashboard.service';
import { AdminBookingManagementQueryDto } from './dto/admin-booking-management-query.dto';
import { AdminPaymentOverviewQueryDto } from './dto/admin-payment-overview-query.dto';
import { TutorStatusQueryDto } from './dto/tutor-status-query.dto';
import { UpdateTutorApplicationStatusDto } from './dto/update-tutor-application-status.dto';

@ApiTags('Admin Dashboard')
@Controller('admindashboard')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('home')
  @ApiOperation({ summary: 'Get admin dashboard home page data' })
  getHome() {
    return this.adminDashboardService.getHome();
  }

  @Get('cards')
  @ApiOperation({ summary: 'Get admin dashboard statistic cards' })
  getCards() {
    return this.adminDashboardService.getCards();
  }

  @Get('tutors')
  @ApiOperation({
    summary: 'Get tutor users with optional status filter',
  })
  getTutors(@Query() query: TutorStatusQueryDto) {
    return this.adminDashboardService.getTutors(query.status);
  }

  @Get('students')
  @ApiOperation({ summary: 'Get all student users for admin dashboard' })
  getStudents() {
    return this.adminDashboardService.getUsersByRole(Role.STUDENT);
  }

  @Get('tutor-applications')
  @ApiOperation({
    summary: 'Get pending and rejected tutor users for admin dashboard',
  })
  getTutorApplications() {
    return this.adminDashboardService.getTutorApplications();
  }

  @Patch('profiles/:profileId/status')
  @ApiOperation({
    summary: 'Update tutor application status by profile id',
  })
  updateTutorApplicationStatus(
    @Param('profileId') profileId: string,
    @Body() dto: UpdateTutorApplicationStatusDto,
  ) {
    return this.adminDashboardService.updateTutorApplicationStatus(
      profileId,
      dto.status,
    );
  }

  @Get('profiles/:profileId')
  @ApiOperation({ summary: 'Get user profile by profile id' })
  getProfileById(@Param('profileId') profileId: string) {
    return this.adminDashboardService.getProfileById(profileId);
  }

  @Get('revenue-overview')
  @ApiOperation({ summary: 'Get admin dashboard revenue overview chart' })
  getRevenueOverview() {
    return this.adminDashboardService.getRevenueOverview();
  }

  @Get('user-joining')
  @ApiOperation({ summary: 'Get admin dashboard user joining chart' })
  getUserJoining() {
    return this.adminDashboardService.getUserJoining();
  }

  @Get('payment-overview')
  @ApiOperation({
    summary: 'Get admin payment overview cards and transaction table',
    description:
      'Admin payment page API. Use this endpoint for the Payment Overview cards and transaction table.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'Albert',
    description: 'Search by transaction id, teacher, student, or course name.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['all', 'GROUP', 'PRIVATE'],
    example: 'all',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['all', 'PENDING', 'PAID', 'FAILED', 'CANCELLED'],
    example: 'all',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin payment overview retrieved.',
    schema: {
      example: {
        success: true,
        data: {
          title: 'Payment Overview',
          subtitle: 'Track all platform payments and transactions.',
          summary: {
            totalRevenue: {
              amount: 328500,
              amountLabel: '$328,500',
            },
            commissionRevenue: {
              amount: 65700,
              amountLabel: '$65,700',
            },
            pendingPayments: {
              amount: 8450,
              amountLabel: '$8,450',
            },
            completedPayouts: {
              amount: 262800,
              amountLabel: '$262,800',
            },
          },
          transactions: [
            {
              transactionId: 'payment_01',
              transactionCode: 'TXN001006',
              teacher: {
                id: 'tutor_albert_flores',
                name: 'Albert Flores',
                email: 'georgia.young@example.com',
              },
              student: {
                id: 'student_jacob_jones',
                name: 'Jacob Jones',
                email: 'nathan.roberts@example.com',
              },
              course: null,
              amount: 94,
              amountLabel: '$94',
              currency: 'usd',
              type: 'PRIVATE',
              typeLabel: 'Private',
              date: '2026-05-20T10:41:00.000Z',
              dateLabel: 'May 20, 2026',
              status: 'PAID',
              statusLabel: 'Paid',
              payoutStatus: 'PENDING',
              payoutStatusLabel: 'Pending',
            },
            {
              transactionId: 'payment_02',
              transactionCode: 'TXN001010',
              teacher: {
                id: 'tutor_floyd_miles',
                name: 'Floyd Miles',
                email: 'debra.holt@example.com',
              },
              student: {
                id: 'student_savannah_nguyen',
                name: 'Savannah Nguyen',
                email: 'michael.mitc@example.com',
              },
              course: {
                id: 'course_computer_science_basics',
                title: 'Computer Science Basics',
              },
              amount: 120,
              amountLabel: '$120',
              currency: 'usd',
              type: 'GROUP',
              typeLabel: 'Group',
              date: '2026-01-19T11:23:00.000Z',
              dateLabel: 'Jan 19, 2026',
              status: 'PAID',
              statusLabel: 'Paid',
              payoutStatus: 'PAID',
              payoutStatusLabel: 'Paid',
            },
          ],
          filteredSummary: {
            totalRevenue: 328500,
            commissionRevenue: 65700,
          },
          filters: {
            search: null,
            type: 'all',
            status: 'all',
          },
          meta: {
            page: 1,
            limit: 10,
            total: 35,
            totalPages: 4,
            from: 1,
            to: 10,
            hasPreviousPage: false,
            hasNextPage: true,
            showingLabel: 'Showing 1 to 10 of 35 users',
          },
        },
      },
    },
  })
  getPaymentOverview(@Query() query: AdminPaymentOverviewQueryDto) {
    return this.adminDashboardService.getPaymentOverview(query);
  }

  @Get('booking-management')
  @ApiOperation({
    summary: 'Get admin booking management table with search and filters',
    description:
      'Admin booking page API. It returns group class bookings and private tutor sessions in one table.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'Jacob',
    description: 'Search by teacher, student, or course name.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['all', 'GROUP', 'PRIVATE'],
    example: 'all',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['all', 'PENDING', 'PAID', 'FAILED', 'CANCELLED'],
    example: 'all',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin booking management data retrieved.',
    schema: {
      example: {
        success: true,
        data: {
          title: 'Booking Management',
          subtitle: 'View and manage all platform bookings and sessions.',
          bookings: [
            {
              bookingId: 'payment_01',
              bookingCode: 'Advanced Mathematics',
              course: {
                id: 'course_advanced_math_101',
                title: 'Advanced Mathematics',
              },
              teacher: {
                id: 'tutor_albert_flores',
                name: 'Albert Flores',
                email: 'georgia.young@example.com',
              },
              student: {
                id: 'student_jacob_jones',
                name: 'Jacob Jones',
                email: 'nathan.roberts@example.com',
              },
              type: 'GROUP',
              typeLabel: 'Group',
              dateTime: {
                date: '2026-05-20T00:00:00.000Z',
                dateLabel: 'May 20, 2026',
                time: '10:41',
                timeLabel: '10:41 AM',
                timeZone: 'Asia/Dhaka',
                durationMinutes: 60,
              },
              status: 'PAID',
              statusLabel: 'Active',
              amount: 94,
              amountLabel: '$94',
            },
            {
              bookingId: 'payment_02',
              bookingCode: 'Private Session',
              course: null,
              teacher: {
                id: 'tutor_jacob_jones',
                name: 'Jacob Jones',
                email: 'nathan.roberts@example.com',
              },
              student: {
                id: 'student_robert_fox',
                name: 'Robert Fox',
                email: 'sara.cruz@example.com',
              },
              type: 'PRIVATE',
              typeLabel: 'Private',
              dateTime: {
                date: '2026-06-01T05:49:00.000Z',
                dateLabel: 'Jun 1, 2026',
                time: null,
                timeLabel: null,
                timeZone: null,
                durationMinutes: null,
              },
              status: 'PAID',
              statusLabel: 'Active',
              amount: 40,
              amountLabel: '$40',
            },
          ],
          filters: {
            search: null,
            type: 'all',
            status: 'all',
          },
          meta: {
            page: 1,
            limit: 10,
            total: 35,
            totalPages: 4,
            from: 1,
            to: 10,
            hasPreviousPage: false,
            hasNextPage: true,
            showingLabel: 'Showing 1 to 10 of 35 users',
          },
        },
      },
    },
  })
  getBookingManagement(@Query() query: AdminBookingManagementQueryDto) {
    return this.adminDashboardService.getBookingManagement(query);
  }
}
