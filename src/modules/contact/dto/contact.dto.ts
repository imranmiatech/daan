import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateContactMessageDto {
  @ApiProperty({
    example: 'Md Imran Mia',
  })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    example: 'imran@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email!: string;
  @ApiProperty({
    example: '+1234567890',
  })
  @IsNotEmpty()
  @IsString()
  phone!: string;

  @ApiProperty({
    example: 'Unable to process payment',
  })
  @IsNotEmpty()
  @IsString()
  subject!: string;

  @ApiProperty({
    example: 'I want to know more about your courses.',
  })

  @IsNotEmpty()
  @IsString()
  message!: string;

  
}

export class UpdateContactStatusDto {
  @ApiProperty({
    enum: ['OPEN', 'PENDING', 'RESOLVED'],
    example: 'RESOLVED',
  })
  @IsIn(['OPEN', 'PENDING', 'RESOLVED'])
  status!: 'OPEN' | 'PENDING' | 'RESOLVED';
}

export class SendContactReplyDto {
  @ApiProperty({
    example: 'Payment not completed',
  })
  @IsNotEmpty()
  @IsString()
  subject!: string;

  @ApiProperty({
    example:
      'Thanks for contacting us. We checked your ticket and our support team will help you shortly.',
  })
  @IsNotEmpty()
  @IsString()
  message!: string;

  @ApiProperty({
    enum: ['OPEN', 'PENDING', 'RESOLVED'],
    example: 'PENDING',
    required: false,
    description: 'Optionally update ticket status after sending the email.',
  })
  @IsOptional()
  @IsIn(['OPEN', 'PENDING', 'RESOLVED'])
  status?: 'OPEN' | 'PENDING' | 'RESOLVED';
}
