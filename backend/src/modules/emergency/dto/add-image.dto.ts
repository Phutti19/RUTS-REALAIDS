import { IsString, IsUrl, MaxLength } from 'class-validator';

export class AddImageDto {
  /** Publicly accessible URL of the uploaded image */
  @IsString()
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  @MaxLength(2000)
  imageUrl: string;
}
