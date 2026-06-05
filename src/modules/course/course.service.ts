import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCourseDto } from './dto/course.dto';

@Injectable()
export class CourseService {
    constructor(private readonly prisma: PrismaService) { }

    async createCourse(tutorId: string, dto: CreateCourseDto) {

        const isTutor = await this.prisma.user.findFirst({
            where: {
                id: tutorId,
                role: Role.TUTOR,
            },
        });

        if (!isTutor) {
            throw new UnauthorizedException("You are not authorized to create a course");
        }

        if (dto.minStudent > dto.maxStudent) {
            throw new BadRequestException("Minimum student must be less than or equal to maximum student");
        }

        const course = await this.prisma.course.create({
            data: {
                ...dto,

                startDate: new Date(dto.startDate),

                enrollmentDeadline: new Date(
                    dto.enrollmentDeadline,
                ),

                tutorId,
            },
        });

        return {
            success: true,
            message: "Course created successfully",
            data: course,
        };

    }

    async getCourseById(id: string) {
        const course =
            await this.prisma.course.findUnique({
                where: {
                    id,
                },
            });

        if (!course) {
            throw new NotFoundException(
                'Course not found',
            );
        }

        return {
            success: true,
            data: course,
        };
    }

    async getAllCourse() {
        const courses = await this.prisma.course.findMany();
        return {
            success: true,
            data: courses,
        };
    }

    
  async updateCourse(
  courseId: string,
  tutorId: string,
  dto: CreateCourseDto,
) {
  const course =
    await this.prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

  if (!course) {
    throw new NotFoundException(
      'Course not found',
    );
  }

  if (course.tutorId !== tutorId) {
    throw new UnauthorizedException(
      'You cannot update this course',
    );
  }

  if (
    dto.minStudent &&
    dto.maxStudent &&
    dto.minStudent > dto.maxStudent
  ) {
    throw new BadRequestException(
      'Minimum student must be less than maximum student',
    );
  }

  const updatedCourse =
    await this.prisma.course.update({
      where: {
        id: courseId,
      },

      data: {
        ...dto,

        ...(dto.startDate && {
          startDate: new Date(
            dto.startDate,
          ),
        }),

        ...(dto.enrollmentDeadline && {
          enrollmentDeadline:
            new Date(
              dto.enrollmentDeadline,
            ),
        }),
      },
    });

  return {
    success: true,
    message:
      'Course updated successfully',
    data: updatedCourse,
  };
}

  async deleteCoursebyId(courseId: string, tutorId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.tutorId !== tutorId) {
      throw new UnauthorizedException('You cannot delete this course');
    }

    await this.prisma.course.delete({
      where: { id: courseId },
    });

    return {
      success: true,
      message: 'Course deleted successfully',
    };
  }
}


