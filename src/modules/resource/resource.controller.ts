import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ResourceService } from './resource.service';
import { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser, Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Resource')
@Controller('resource')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Post()
  @UseGuards(AuthGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new resource (Tutor/Admin only)' })
  @ApiResponse({ status: 201, description: 'Resource created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  createResource(
    @Body() dto: CreateResourceDto,
    @CurrentUser() user: any,
  ) {
    return this.resourceService.createResource(user.userId, dto);
  }

  @Get('my')
  @UseGuards(AuthGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all my resources (Tutor/Admin only)' })
  @ApiResponse({ status: 200, description: 'Resources retrieved successfully.' })
  getMyResources(@CurrentUser() user: any) {
    return this.resourceService.getMyResources(user.userId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a resource (Tutor/Admin only)' })
  @ApiResponse({ status: 200, description: 'Resource updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Resource not found.' })
  updateResource(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateResourceDto,
  ) {
    return this.resourceService.updateResource(id, user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a resource (Tutor/Admin only)' })
  @ApiResponse({ status: 200, description: 'Resource deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Resource not found.' })
  deleteResource(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.resourceService.deleteResource(id, user.userId);
  }
}
