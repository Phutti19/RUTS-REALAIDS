import {
  IsUUID,
  IsString,
  IsOptional,
  IsInt,
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

  /** Recommended rest days (0 = no rest required, null = not specified) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  restDays?: number | null;
}
