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
  @IsString()
  @IsNotEmpty()
  url: string;
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
