import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum TutorStudentCourseTypeFilter {
  ALL = 'all',
  GROUP = 'group',
  PRIVATE = 'private',
}

export class TutorStudentsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of students per page',
    example: 10,
    minimum: 1,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search by student name or email',
    example: 'Albert',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter students by group course or private hire',
    enum: TutorStudentCourseTypeFilter,
    default: TutorStudentCourseTypeFilter.ALL,
  })
  @IsOptional()
  @IsEnum(TutorStudentCourseTypeFilter)
  type?: TutorStudentCourseTypeFilter = TutorStudentCourseTypeFilter.ALL;
}
