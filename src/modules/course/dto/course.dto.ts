import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

  @IsArray()
  curriculums!: string[];

  @IsDateString()
  startDate!: string;

  @IsString()
  time!: string;

  @IsString()
  timeZone!: string;

  @IsNumber()
  @Min(1)
  classDuration!: number;

  @IsString()
  language!: string;

  @IsNumber()
  @Min(1)
  courseDuration!: number;

  @IsNumber()
  pricePerStudent!: number;

  @IsNumber()
  minStudent!: number;

  @IsNumber()
  maxStudent!: number;

  @IsDateString()
  enrollmentDeadline!: string;
}

export enum CourseSubjectFilter {
  ALL = 'All Subjects',
  PROGRAMMING = 'Programming',
  LANGUAGES = 'Languages',
  MATHEMATICS = 'Mathematics',
  MUSIC = 'MUSIC',
  SCIENCE = 'SCIENCE',
  BUSINESS = 'BUSINESS',
  DESIGN = 'DESIGN',
  WRITING = 'WRITTING',
}

export enum CoursePriceFilter {
  ALL = 'All Prices',
  ZERO_TO_FORTY = '$0 - $40/hr',
  FORTY_TO_SIXTY = '$40 - $60/hr',
  SIXTY_PLUS = '$60+/hr',
}

export class UpcomingCourseQueryDto {
  @IsOptional()
  @IsEnum(CourseSubjectFilter)
  subject?: CourseSubjectFilter;

  @IsOptional()
  @IsEnum(CoursePriceFilter)
  price?: CoursePriceFilter;
}
