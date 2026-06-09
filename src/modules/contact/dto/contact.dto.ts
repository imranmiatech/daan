import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

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
    example: 'I want to know more about your courses.',
  })

  @IsNotEmpty()
  @IsString()
  message!: string;

  
}
