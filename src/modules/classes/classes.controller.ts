import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClassesService } from './classes.service';
import {
  ClassStudentsQueryDto,
  CreateClassResourceDto,
} from './dto/classes.dto';

@ApiTags('Classes')
@Controller('classes')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.TUTOR)
@ApiBearerAuth()
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get(':courseId/meta')
  @ApiOperation({ summary: 'Get tutor class page metadata cards' })
  @ApiResponse({ status: 200, description: 'Class metadata retrieved.' })
  getMeta(
    @CurrentUser() user: { userId: string },
    @Param('courseId') courseId: string,
  ) {
    return this.classesService.getMeta(user.userId, courseId);
  }

  @Get(':courseId/overview')
  @ApiOperation({ summary: 'Get tutor class page overview' })
  @ApiResponse({ status: 200, description: 'Class overview retrieved.' })
  getOverview(
    @CurrentUser() user: { userId: string },
    @Param('courseId') courseId: string,
  ) {
    return this.classesService.getOverview(user.userId, courseId);
  }

  @Get(':courseId/students')
  @ApiOperation({ summary: 'Get enrolled students for a tutor class' })
  getStudents(
    @CurrentUser() user: { userId: string },
    @Param('courseId') courseId: string,
    @Query() query: ClassStudentsQueryDto,
  ) {
    return this.classesService.getStudents(user.userId, courseId, query);
  }

  @Get(':courseId/enrolled-students')
  @ApiOperation({ summary: 'Get enrolled student names and enrollment dates' })
  getEnrolledStudents(
    @CurrentUser() user: { userId: string },
    @Param('courseId') courseId: string,
  ) {
    return this.classesService.getEnrolledStudents(user.userId, courseId);
  }

  @Delete(':courseId/enrolled-students/:studentId')
  @ApiOperation({ summary: 'Remove a student from a tutor class by student ID' })
  deleteEnrolledStudent(
    @CurrentUser() user: { userId: string },
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.classesService.deleteEnrolledStudent(
      user.userId,
      courseId,
      studentId,
    );
  }

  @Get(':courseId/lessons')
  @ApiOperation({ summary: 'Get lessons for a tutor class' })
  getLessons(
    @CurrentUser() user: { userId: string },
    @Param('courseId') courseId: string,
  ) {
    return this.classesService.getLessons(user.userId, courseId);
  }

  @Get(':courseId/resources')
  @ApiOperation({ summary: 'Get resources for a tutor class' })
  getResources(
    @CurrentUser() user: { userId: string },
    @Param('courseId') courseId: string,
  ) {
    return this.classesService.getResources(user.userId, courseId);
  }

  @Post(':courseId/resources')
  @ApiOperation({ summary: 'Add resource to a tutor class' })
  addResource(
    @CurrentUser() user: { userId: string },
    @Param('courseId') courseId: string,
    @Body() dto: CreateClassResourceDto,
  ) {
    return this.classesService.addResource(user.userId, courseId, dto);
  }

  @Delete(':courseId/resources/:resourceId')
  @ApiOperation({ summary: 'Delete resource from a tutor class' })
  deleteResource(
    @CurrentUser() user: { userId: string },
    @Param('courseId') courseId: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.classesService.deleteResource(
      user.userId,
      courseId,
      resourceId,
    );
  }
}
