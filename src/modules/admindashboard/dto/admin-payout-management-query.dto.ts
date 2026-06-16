import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PayoutStatus } from '@prisma/client';

export const ADMIN_PAYOUT_STATUS_FILTERS = [
  'all',
  PayoutStatus.PENDING,
  PayoutStatus.ON_HOLD,
  PayoutStatus.PROCESSING,
  PayoutStatus.PAID,
  PayoutStatus.FAILED,
] as const;

export type AdminPayoutStatusFilter =
  (typeof ADMIN_PAYOUT_STATUS_FILTERS)[number];

export class AdminPayoutManagementQueryDto {
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
  @IsIn(ADMIN_PAYOUT_STATUS_FILTERS)
  status?: AdminPayoutStatusFilter = 'all';
}
