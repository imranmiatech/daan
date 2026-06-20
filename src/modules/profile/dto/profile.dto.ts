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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EducationDto {
  @ApiPropertyOptional({
    description: 'Institution name.',
    example: 'National University of USA',
  })
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiPropertyOptional({
    description: 'Country of the institution.',
    example: 'United States',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'City of the institution.',
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Degree title.',
    example: 'Bachelor of Philosophy',
  })
  @IsOptional()
  @IsString()
  degree?: string;

  @ApiPropertyOptional({
    description: 'Graduation passing year.',
    example: 2020,
  })
  @IsOptional()
  @IsNumber()
  passingYear?: number;
}

export class AvailabilityDto {
  @ApiPropertyOptional({
    description: 'Day of the week.',
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
  })
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @ApiPropertyOptional({
    description: 'Shift start time in HH:mm format.',
    example: '09:00',
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Shift end time in HH:mm format.',
    example: '17:00',
  })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Availability timezone.',
    example: 'Asia/Dhaka',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class CreateProfileDto {
  @ApiPropertyOptional({
    description: 'User full name.',
    example: 'Morgan Pill',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    description: 'User country.',
    example: 'United States',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'User city.',
    example: 'Los Angeles',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Profile image URL. Use avatarFile for upload.',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Short profile bio.',
    example: 'Programming tutor focused on practical learning.',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Years of teaching experience.',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  yearOfExperience?: number;

  @ApiPropertyOptional({
    description: 'Hourly price.',
    example: 25,
  })
  @IsOptional()
  @IsNumber()
  pricePerHour?: number;

  @ApiPropertyOptional({
    description: 'Languages the tutor can teach in.',
    example: 'English',
  })
  @IsOptional()
  @IsString()
  languageExpertise?: string;

  @ApiPropertyOptional({
    description: 'Long profile/about text.',
    example: 'I help students learn programming with real projects.',
  })
  @IsOptional()
  @IsString()
  aboutMe?: string;

  @ApiPropertyOptional({
    description: 'Primary teaching category.',
    example: 'Programming',
  })
  @IsOptional()
  @IsString()
  teachingCategory?: string;

  @ApiPropertyOptional({
    description: 'Teaching skills or subjects.',
    type: [String],
    example: ['Python', 'Web Development'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teachingSkills?: string[];

  @ApiPropertyOptional({
    description: 'Default session duration in minutes.',
    example: 60,
  })
  @IsOptional()
  @IsNumber()
  sessionDuration?: number;

  @ApiPropertyOptional({
    description: 'Profile intro video URL. Use videoFile for upload.',
    example: 'https://example.com/profile-video.mp4',
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Education history.',
    type: [EducationDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiPropertyOptional({
    description: 'Weekly availability.',
    type: [AvailabilityDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDto)
  availability?: AvailabilityDto[];
}

export class UpdateProfileDto extends CreateProfileDto {}

export class PublicCreateProfileDto extends CreateProfileDto {
  @ApiProperty({
    description: 'User ID that owns this profile.',
    example: '5f5b9d3b-6e9f-4b08-8df0-1014a4c62f2d',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
