import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpsertAdminProfileDto {
  @ApiPropertyOptional({ example: 'Istiaq' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Turjo' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'ia.turjo18@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+880 1777 327 280' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Admin photo URL. Use avatarFile for upload.',
    example: 'https://example.com/admin-avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
