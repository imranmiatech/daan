import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupClassCheckoutSessionDto {
  @ApiProperty({
    description: 'Course/group class ID the student wants to enroll in.',
    example: 'course_advanced_math_101',
  })
  @IsString()
  @IsNotEmpty()
  courseId: string;
}

export class CreatePrivateBookingCheckoutSessionDto {
  @ApiProperty({
    description: 'Tutor ID the student wants to book for a private 1-on-1 lesson.',
    example: 'tutor_albert_flores',
  })
  @IsString()
  @IsNotEmpty()
  tutorId: string;

  @ApiPropertyOptional({
    description: 'Number of private sessions to purchase. Defaults to 1.',
    minimum: 1,
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionCount?: number;

  @ApiPropertyOptional({
    description: 'Selected private lesson start time.',
    example: '2026-06-18T15:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class CreateCheckoutSessionDto {
  @ApiPropertyOptional({
    description:
      'Use courseId when the student wants to pay for a tutor-created group class. Do not send tutorId with this.',
    example: 'course_advanced_math_101',
  })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({
    description:
      'Use tutorId when the student wants to book a private 1-on-1 session. Do not send courseId with this.',
    example: 'tutor_albert_flores',
  })
  @IsOptional()
  @IsString()
  tutorId?: string;

  @ApiPropertyOptional({
    description:
      'Only used for private tutor bookings. Defaults to 1 if not provided.',
    minimum: 1,
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionCount?: number;

  @ApiPropertyOptional({
    description:
      'Selected private lesson start time. Required for scheduled private tutor bookings.',
    example: '2026-06-18T15:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
