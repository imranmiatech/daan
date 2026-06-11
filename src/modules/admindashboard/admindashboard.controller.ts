import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminDashboardService } from './admindashboard.service';
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
}
