import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  /** Student ID (e.g. 64010001) — optional for staff accounts created by admin */
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72, { message: 'Password must not exceed 72 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
