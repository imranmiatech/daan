import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hello, I need help with my math assignment!',
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Type of message',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @ApiPropertyOptional({
    description: 'URL for file/image attachments',
    example: 'https://storage.example.com/files/document.pdf',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  fileUrl?: string;
}

export class EditMessageDto {
  @ApiProperty({
    description: 'Updated message content',
    example: 'Hello, I need help with my physics assignment!',
  })
  @IsNotEmpty()
  @IsString()
  content: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Message sent successfully' })
  message: string;

  @ApiProperty()
  data: any;
}
