import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaymentStatus, PaymentType } from '@prisma/client';

export const ADMIN_PAYMENT_TYPE_FILTERS = [
  'all',
  PaymentType.GROUP,
  PaymentType.PRIVATE,
] as const;

export type AdminPaymentTypeFilter =
  (typeof ADMIN_PAYMENT_TYPE_FILTERS)[number];

export const ADMIN_PAYMENT_STATUS_FILTERS = [
  'all',
  PaymentStatus.PENDING,
  PaymentStatus.PAID,
  PaymentStatus.FAILED,
  PaymentStatus.CANCELLED,
] as const;

export type AdminPaymentStatusFilter =
  (typeof ADMIN_PAYMENT_STATUS_FILTERS)[number];

export class AdminPaymentOverviewQueryDto {
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
  @IsIn(ADMIN_PAYMENT_TYPE_FILTERS)
  type?: AdminPaymentTypeFilter = 'all';

  @IsOptional()
  @IsIn(ADMIN_PAYMENT_STATUS_FILTERS)
  status?: AdminPaymentStatusFilter = 'all';
}
