import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApplicationStatus } from '@prisma/client';
import { UserProfileResponseDto } from '../../auth/dto/auth.dto';

export class UpdateStatusDto {
  /**
   * The new application status (e.g. DRAFT, PENDING, APPROVED, REJECTED).
   * @example "APPROVED"
   */
  @IsNotEmpty()
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;
}

export class UpdateStatusResponseDto {
  /**
   * Indicates if the update was successful.
   * @example true
   */
  success!: boolean;

  /**
   * Success message.
   * @example "Application status updated to APPROVED successfully"
   */
  message!: string;

  /**
   * The updated user profile details.
   */
  data!: UserProfileResponseDto;
}
