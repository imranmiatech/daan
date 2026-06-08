import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CourseService } from './course.service';
import { CreateCourseDto, UpcomingCourseQueryDto } from './dto/course.dto';

@ApiTags('Course')
@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post('create')
  @UseGuards(AuthGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course (Tutor/Admin only)' })
  @ApiResponse({ status: 201, description: 'Course created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  createCourse(
    @Body() createCourseDto: CreateCourseDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.courseService.createCourse(user.userId, createCourseDto);
  }

  @Get('upcoming')
  @ApiOperation({
    summary: 'Get upcoming courses with subject and price filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Upcoming courses retrieved successfully.',
  })
  getUpcomingCourses(@Query() query: UpcomingCourseQueryDto) {
    return this.courseService.getUpcomingCourses(query);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all courses' })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully.' })
  getAllCourse() {
    return this.courseService.getAllCourse();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  getCourseById(@Param('id') id: string) {
    return this.courseService.getCourseById(id);
  }

  @Post(':id/curriculums/:curriculumIndex/complete')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a course class as completed' })
  @ApiResponse({ status: 201, description: 'Class marked as completed.' })
  @ApiResponse({ status: 400, description: 'Invalid curriculum index.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  completeCurriculum(
    @Param('id') id: string,
    @Param('curriculumIndex', ParseIntPipe) curriculumIndex: number,
    @CurrentUser() user: { userId: string },
  ) {
    return this.courseService.completeCurriculum(
      id,
      curriculumIndex,
      user.userId,
    );
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a course (Tutor/Admin only)' })
  @ApiResponse({ status: 200, description: 'Course updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  updateCourse(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateCourseDto,
  ) {
    return this.courseService.updateCourse(id, user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles(Role.TUTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a course (Tutor/Admin only)' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  deleteCourse(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.courseService.deleteCoursebyId(id, user.userId);
  }
}
