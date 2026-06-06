import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
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
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @ApiOperation({
    summary: 'Get all users with their profiles',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully.',
  })
  getAllUsers() {
    return this.usersService.findAll();
  }
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires ADMIN role.',
  })
  findAll() {
    return this.usersService.findAll();
  }

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
