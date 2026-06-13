import {
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    example: 'Bank Transfer',
  })
  @IsString()
  paymentMethod: string;

  @ApiProperty({
    example: 'Md Imran Mia',
  })
  @IsString()
  legalName: string;

  @ApiProperty({
    example: 'Dutch Bangla Bank',
    required: false,
  })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({
    example: 'Md Imran Mia',
    required: false,
  })
  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @ApiProperty({
    example: '1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiProperty({
    example: '090123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  routingNumber?: string;
}

export class UpdateSettingsDto {
  @ApiProperty({
    example: 'Bank Transfer',
  })
  @IsString()
  paymentMethod: string;

  @ApiProperty({
    example: 'Md Imran Mia',
  })
  @IsString()
  legalName: string;

  @ApiProperty({
    example: 'Dutch Bangla Bank',
    required: false,
  })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({
    example: 'Md Imran Mia',
    required: false,
  })
  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @ApiProperty({
    example: '1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiProperty({
    example: '090123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  routingNumber?: string;
}


export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyCourseUpdates?: boolean;

  @ApiProperty({
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyNewContent?: boolean;

  @ApiProperty({
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyLessonReminders?: boolean;

  @ApiProperty({
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyNewMessages?: boolean;

  @ApiProperty({
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyWeeklyDigest?: boolean;
}
