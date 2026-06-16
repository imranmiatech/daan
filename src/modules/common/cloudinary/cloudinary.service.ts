import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

type UploadResourceType = 'image' | 'video' | 'raw' | 'auto';

type UploadOptions = {
  folder: string;
  resourceType?: UploadResourceType;
  allowedMimeTypes?: string[];
  maxBytes?: number;
};

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
  }

  async uploadFile(file: any, options: UploadOptions) {
    this.assertConfigured();
    this.validateFile(file, options);

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: options.resourceType ?? 'auto',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }

          resolve(uploadResult);
        },
      );

      uploadStream.end(file.buffer);
    });

    return this.mapUploadResult(result, file);
  }

  private assertConfigured() {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      );
    }
  }

  private validateFile(file: any, options: UploadOptions) {
    if (!file?.buffer) {
      throw new BadRequestException('File is required');
    }

    const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;

    if (file.size > maxBytes) {
      throw new BadRequestException(
        `File is too large. Maximum size is ${Math.round(maxBytes / 1024 / 1024)}MB`,
      );
    }

    if (
      options.allowedMimeTypes?.length &&
      !options.allowedMimeTypes.includes(file.mimetype)
    ) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${options.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  private mapUploadResult(result: UploadApiResponse, file: any) {
    return {
      publicId: result.public_id,
      url: result.secure_url,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      originalName: file.originalname,
      mimeType: file.mimetype,
      width: result.width ?? null,
      height: result.height ?? null,
      createdAt: result.created_at,
    };
  }
}
