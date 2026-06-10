import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  tutorId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sessionCount?: number;
}
