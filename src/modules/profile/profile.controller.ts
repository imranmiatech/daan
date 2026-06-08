import { Controller, Get, Req, UseGuards, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) { }

  @Get('my')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get logged-in user profile details (includes education & availability)' })
  @ApiResponse({ status: 200, description: 'Profile details retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMyProfile(@Req() req: any) {
    const userId = req.user.userId;
    return this.profileService.getProfile(userId);
  }

  @Get('tutor/:userId')
  getTutorProfile(@Param('userId') userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Get(':tutorId/availability')
  getTutorAvailability(
    @Param('tutorId') tutorId: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.profileService.getTutorAvailability(tutorId, courseId);
  }
}
