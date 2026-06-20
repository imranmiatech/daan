import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const ADMIN_GROUP_CLASS_STATUS_FILTERS = [
  'all',
  'active',
  'upcoming',
  'live',
  'completed',
] as const;

export type AdminGroupClassStatusFilter =
  (typeof ADMIN_GROUP_CLASS_STATUS_FILTERS)[number];

export class AdminGroupClassesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(ADMIN_GROUP_CLASS_STATUS_FILTERS)
  status?: AdminGroupClassStatusFilter = 'all';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;
}

export class AdminGroupClassDetailQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;
}
