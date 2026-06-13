import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAgoraRtcTokenDto {
  @ApiProperty({
    description: 'Agora channel name. Keep this identical on every client.',
    example: 'lesson-course123-0',
  })
  @IsString()
  channelName!: string;

  @ApiPropertyOptional({
    description:
      'Numeric Agora UID. Defaults to a deterministic UID for the authenticated user.',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  uid?: number;

  @ApiPropertyOptional({
    enum: ['publisher', 'subscriber'],
    default: 'publisher',
  })
  @IsOptional()
  @IsIn(['publisher', 'subscriber'])
  role?: 'publisher' | 'subscriber' = 'publisher';

  @ApiPropertyOptional({
    description: 'Token lifetime in seconds.',
    default: 3600,
    minimum: 60,
    maximum: 86400,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  expireSeconds?: number;
}
