import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CourseService } from './course.service';
import { CurrentUser, Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreateCourseDto } from './dto/course.dto';

@ApiTags('Course')
@Controller('course')
export class CourseController {
    constructor(private readonly courseService: CourseService) { }

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
        @CurrentUser() user: any,
    ) {
        return this.courseService.createCourse(user.userId, createCourseDto);
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
    getCourseById(
        @Param('id') id: string,
    ) {
        return this.courseService.getCourseById(id);
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
        @CurrentUser() user: any,
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
        @CurrentUser() user: any,
    ) {
        return this.courseService.deleteCoursebyId(id, user.userId);
    }
}

