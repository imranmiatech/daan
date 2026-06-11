import { ApplicationStatus } from '@prisma/client';
import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateTutorApplicationStatusDto {
  @IsNotEmpty()
  @IsIn([
    ApplicationStatus.PENDING,
    ApplicationStatus.APPROVED,
    ApplicationStatus.REJECTED,
  ])
  status!: ApplicationStatus;
}
