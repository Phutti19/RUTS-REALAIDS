import {
  IsUUID,
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  MaxLength,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateCertificateDto {
  /** UUID of the patient_visit this certificate belongs to */
  @IsUUID()
  visitId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @Transform(({ value }: { value: string }) => value?.trim())
  diagnosisText: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  recommendation?: string | null;

  /** Recommended rest days (0 = no rest required, null = not specified) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  restDays?: number | null;

  @IsOptional()
  @IsDateString()
  restStartDate?: string | null;

  @IsOptional()
  @IsDateString()
  restEndDate?: string | null;
}
