import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import {
  CreateProfileDto,
  PublicCreateProfileDto,
  UpdateProfileDto,
} from './dto/profile.dto';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('my')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get logged-in user profile details (includes education & availability)',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile details retrieved successfully.',
  })
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

  @Post('create')
  @ApiOperation({ summary: 'Create user profile details without login' })
  @ApiResponse({ status: 201, description: 'Profile created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  createMyProfile(@Body() dto: PublicCreateProfileDto) {
    return this.profileService.createProfile(dto.userId, dto);
  }

  @Patch('update')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update logged-in user profile details' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  updateMyProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const userId = req.user.userId;
    return this.profileService.updateProfile(userId, dto);
  }
  
}
