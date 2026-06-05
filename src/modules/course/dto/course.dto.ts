import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  title: string;

  @IsString()
  category: string;

  @IsString()
  description: string;

  @IsArray()
  extraInfos: string[];

  @IsArray()
  topics: string[];

  @IsOptional()
  @IsString()
  requirement?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsArray()
  curriculums: string[];

  @IsDateString()
  startDate: string;

  @IsString()
  time: string;

  @IsString()
  timeZone: string;

  @IsNumber()
  @Min(1)
  classDuration: number;

  @IsString()
  language: string;

  @IsNumber()
  @Min(1)
  courseDuration: number;

  @IsNumber()
  pricePerStudent: number;

  @IsNumber()
  minStudent: number;

  @IsNumber()
  maxStudent: number;

  @IsDateString()
  enrollmentDeadline: string;
}