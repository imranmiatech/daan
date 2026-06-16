import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProfileService } from './profile.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import {
  CreateProfileDto,
  PublicCreateProfileDto,
  UpdateProfileDto,
} from './dto/profile.dto';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('my')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get logged-in user profile details (includes education & availability)',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile details retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMyProfile(@Req() req: any) {
    const userId = req.user.userId;
    return this.profileService.getProfile(userId);
  }

  @Get('tutor/:userId')
  getTutorProfile(@Param('userId') userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Get(':tutorId/availability')
  getTutorAvailability(
    @Param('tutorId') tutorId: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.profileService.getTutorAvailability(tutorId, courseId);
  }

  @Post('create')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatarFile', maxCount: 1 },
        { name: 'videoFile', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 50 * 1024 * 1024 },
      },
    ),
  )
  @ApiOperation({ summary: 'Create user profile details without login' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        avatarFile: {
          type: 'string',
          format: 'binary',
          description: 'Optional profile image. Saved to avatarUrl.',
        },
        videoFile: {
          type: 'string',
          format: 'binary',
          description: 'Optional profile video. Saved to videoUrl.',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Profile created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  createMyProfile(
    @Body() dto: PublicCreateProfileDto,
    @UploadedFiles()
    files?: {
      avatarFile?: any[];
      videoFile?: any[];
    },
  ) {
    const normalizedDto = this.normalizeProfileBody(dto) as PublicCreateProfileDto;
    return this.profileService.createProfile(
      normalizedDto.userId,
      normalizedDto,
      {
        avatarFile: files?.avatarFile?.[0],
        videoFile: files?.videoFile?.[0],
      },
    );
  }

  @Patch('update')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatarFile', maxCount: 1 },
        { name: 'videoFile', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 50 * 1024 * 1024 },
      },
    ),
  )
  @ApiOperation({ summary: 'Update logged-in user profile details' })
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          deprecated: true,
          description: 'Use avatarFile instead.',
        },
        avatarFile: {
          type: 'string',
          format: 'binary',
          description: 'Optional profile image. Saved to avatarUrl.',
        },
        videoFile: {
          type: 'string',
          format: 'binary',
          description: 'Optional profile video. Saved to videoUrl.',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  updateMyProfile(
    @Req() req: any,
    @Body() dto: UpdateProfileDto,
    @UploadedFiles()
    files?: {
      avatarFile?: any[];
      videoFile?: any[];
    },
  ) {
    const userId = req.user.userId;
    return this.profileService.updateProfile(
      userId,
      this.normalizeProfileBody(dto),
      {
        avatarFile: files?.avatarFile?.[0],
        videoFile: files?.videoFile?.[0],
      },
    );
  }

  private normalizeProfileBody<T extends Record<string, any>>(dto: T): T {
    return {
      ...dto,
      yearOfExperience: this.toNumber(dto.yearOfExperience),
      pricePerHour: this.toNumber(dto.pricePerHour),
      sessionDuration: this.toNumber(dto.sessionDuration),
      teachingSkills: this.toStringArray(dto.teachingSkills),
      education: this.toJsonArray(dto.education),
      availability: this.toJsonArray(dto.availability),
    };
  }

  private toNumber(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return Number(value);
  }

  private toStringArray(value: unknown) {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();

    if (trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private toJsonArray(value: unknown) {
    if (value === undefined || value === null || Array.isArray(value)) {
      return value;
    }

    if (typeof value !== 'string' || value.trim() === '') {
      return undefined;
    }

    return JSON.parse(value);
  }
  
}
