import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListCertificatesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  /** Filter by patient UUID — staff only; students always see own */
  @IsOptional()
  @IsUUID()
  patientId?: string;

  /** Filter by visit UUID */
  @IsOptional()
  @IsUUID()
  visitId?: string;

  /** Free-text: search certificate number or patient name */
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(['created_at', 'certificate_number'])
  sortBy?: string = 'created_at';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}
