import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsInt,
  IsDateString,
  Matches,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class RegisterWalkInPatientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }: { value: string }) => value?.trim())
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName: string;

  /**
   * Student ID — also used as the initial password.
   * Accepts digits, letters, and hyphens (e.g. 6501012345 or 65-01012345).
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9\-]{4,20}$/, {
    message: 'studentId must be 4–20 alphanumeric characters (hyphens allowed)',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  studentId: string;

  /**
   * Optional email. If omitted, auto-generated as {studentId}@student.ruts.ac.th
   */
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }: { value: string }) => value?.trim())
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  department?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  yearOfStudy?: number | null;

  @IsOptional()
  @IsDateString({}, { message: 'birthDate must be a valid date string (YYYY-MM-DD)' })
  birthDate?: string | null;
}
