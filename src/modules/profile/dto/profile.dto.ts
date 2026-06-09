import {
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  ValidateNested,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from '@prisma/client';

export class EducationDto {
  /**
   * Institution name.
   * @example "Oxford University"
   */
  @IsOptional()
  @IsString()
  institution?: string;

  /**
   * Country of the institution.
   * @example "United Kingdom"
   */
  @IsOptional()
  @IsString()
  country?: string;

  /**
   * City of the institution.
   * @example "Oxford"
   */
  @IsOptional()
  @IsString()
  city?: string;

  /**
   * Degree title.
   * @example "Bachelor of Science in Computer Science"
   */
  @IsOptional()
  @IsString()
  degree?: string;

  /**
   * Graduation passing year.
   * @example 2022
   */
  @IsOptional()
  @IsNumber()
  passingYear?: number;
}

export class AvailabilityDto {
  /**
   * Day of the week.
   * @example "MONDAY"
   */
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  /**
   * Shift start time.
   * @example "09:00"
   */
  @IsOptional()
  @IsString()
  startTime?: string;

  /**
   * Shift end time.
   * @example "17:00"
   */
  @IsOptional()
  @IsString()
  endTime?: string;

  /**
   * Availability timezone.
   * @example "Asia/Dhaka"
   */
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class CreateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsNumber()
  yearOfExperience?: number;

  @IsOptional()
  @IsNumber()
  pricePerHour?: number;

  @IsOptional()
  @IsString()
  languageExpertise?: string;

  @IsOptional()
  @IsString()
  aboutMe?: string;

  @IsOptional()
  @IsString()
  teachingCategory?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teachingSkills?: string[];

  @IsOptional()
  @IsNumber()
  sessionDuration?: number;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDto)
  availability?: AvailabilityDto[];
}

export class UpdateProfileDto extends CreateProfileDto {}

export class PublicCreateProfileDto extends CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
