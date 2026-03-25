import { IsString, IsOptional, IsUrl, IsInt, MaxLength, Min } from 'class-validator';

export class AddImageDto {
  /** Publicly accessible URL of the uploaded image */
  @IsString()
  @IsUrl({}, { message: 'URL ของรูปภาพไม่ถูกต้อง' })
  @MaxLength(2000)
  imageUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  caption?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
