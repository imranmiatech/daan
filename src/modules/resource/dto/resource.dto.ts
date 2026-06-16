import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateResourceDto {
  /**
   * Resource name.
   * @example "JavaScript Basics PDF"
   */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * Resource URL.
   * @example "https://example.com/resource.pdf"
   */
  @IsOptional()
  @IsString()
  url?: string;

  /**
   * Optional course id for course-specific resources.
   * @example "course_uuid"
   */
  @IsOptional()
  @IsString()
  courseId?: string;
}

export class UpdateResourceDto {
  /**
   * Updated resource name.
   * @example "Advanced JavaScript PDF"
   */
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * Updated resource URL.
   * @example "https://example.com/updated-resource.pdf"
   */
  @IsOptional()
  @IsString()
  url?: string;
}
