import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class StudentLessonQueryDto {
  @ApiPropertyOptional({
    enum: ['upcoming', 'completed', 'cancelled'],
    description: 'Filter the list by lesson tab.',
  })
  @IsOptional()
  @IsIn(['upcoming', 'completed', 'cancelled'])
  status?: 'upcoming' | 'completed' | 'cancelled';
}

export class StudentLessonReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({
    example: 'This lesson explained the concepts clearly.',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
