import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * Fields that staff can edit on a patient's user record
 * (demographics collected at intake time).
 */
export class UpdatePatientProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  title?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{13}$/, { message: 'national_id must be 13 digits' })
  nationalId?: string | null;

  /** ISO date string YYYY-MM-DD */
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  birthDate?: string | null;

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
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  position?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  phone?: string | null;
}
