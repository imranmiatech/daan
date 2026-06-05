import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { UpdateStatusDto, UpdateStatusResponseDto } from './dto/update-status.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('profiles/:profileId/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve or Reject a tutor application profile (Admin Only)' })
  @ApiResponse({
    status: 200,
    description: 'Profile status updated successfully.',
    type: UpdateStatusResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires ADMIN role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User profile not found.',
  })
  updateStatus(
    @Param('profileId') profileId: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.usersService.updateProfileStatus(profileId, updateStatusDto.status);
  }
}
