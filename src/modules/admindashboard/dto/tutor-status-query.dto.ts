import { ApplicationStatus } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';

export const TUTOR_STATUS_FILTERS = [
  'all',
  ApplicationStatus.PENDING,
  ApplicationStatus.APPROVED,
  ApplicationStatus.REJECTED,
] as const;

export type TutorStatusFilter = (typeof TUTOR_STATUS_FILTERS)[number];

export class TutorStatusQueryDto {
  @IsOptional()
  @IsIn(TUTOR_STATUS_FILTERS)
  status?: TutorStatusFilter;
}
