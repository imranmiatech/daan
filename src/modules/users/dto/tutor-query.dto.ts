import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class TutorQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for tutor pagination',
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
    description:
      'Tutor subject/category filter. Use "All Subjects" or omit for all.',
    example: 'Programming',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description:
      'Tutor hourly price filter. Supported values: "All Prices", "0-40", "40-60", "60+".',
    example: '0-40',
  })
  @IsOptional()
  @IsString()
  price?: string;
}
