import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

function toMinuteNumber(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const match = value.trim().match(/^(\d+)\s*(m|min|mins|minute|minutes)?$/i);

  return match ? Number(match[1]) : Number(value);
}

export class CreateCourseLessonDto {
  @IsString()
  title!: string;

  @IsDateString()
  date!: string;

  @IsString()
  time!: string;
}

export class UpdateCourseLessonDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  time?: string;
}

export class CreateCourseDto {
  @IsString()
  title!: string;

  @IsString()
  category!: string;

  @IsString()
  description!: string;

  @IsArray()
  extraInfos!: string[];

  @IsArray()
  topics!: string[];

  @IsOptional()
  @IsString()
  requirement?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsArray()
  curriculums?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCourseLessonDto)
  curriculumItems?: CreateCourseLessonDto[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsString()
  timeZone!: string;

  @IsInt()
  @Min(1)
  @Transform(({ value }) => toMinuteNumber(value))
  classDuration!: number;

  @IsString()
  language!: string;

  @IsInt()
  @Min(1)
  @Transform(({ value }) => toMinuteNumber(value))
  courseDuration!: number;

  @IsNumber()
  @Min(0)
  pricePerStudent!: number;

  @IsNumber()
  @Min(1)
  minStudent!: number;

  @IsNumber()
  @Min(1)
  maxStudent!: number;

  @IsDateString()
  enrollmentDeadline!: string;
}

export enum CourseSubjectFilter {
  ALL = 'All Subjects',
  PROGRAMMING = 'Programming',
  LANGUAGES = 'Languages',
  MATHEMATICS = 'Mathematics',
  MUSIC = 'Music',
  SCIENCE = 'Science',
  BUSINESS = 'Business',
  DESIGN = 'Design',
  WRITING = 'Writing',
}

export enum CoursePriceFilter {
  ALL = 'All Prices',
  ZERO_TO_FORTY = '$0 - $40/hr',
  FORTY_TO_SIXTY = '$40 - $60/hr',
  SIXTY_PLUS = '$60+/hr',
}

export enum UpcomingCourseDateFilter {
  ALL = 'All Upcoming',
  STARTING_SOON = 'Starting Soon',
  THIS_WEEK = 'This Week',
  THIS_MONTH = 'This Month',
}

export class UpcomingCourseQueryDto {
  @IsOptional()
  @IsEnum(CourseSubjectFilter)
  subject?: CourseSubjectFilter;

  @IsOptional()
  @IsEnum(CoursePriceFilter)
  price?: CoursePriceFilter;

  @IsOptional()
  @IsEnum(UpcomingCourseDateFilter)
  date?: UpcomingCourseDateFilter;
}
