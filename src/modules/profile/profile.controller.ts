import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/profile.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

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

  @Patch('my')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update logged-in user profile details & user display name' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  updateMyProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const userId = req.user.userId;
    return this.profileService.updateProfile(userId, updateProfileDto);
  }
}
