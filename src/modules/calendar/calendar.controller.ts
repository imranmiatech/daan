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
