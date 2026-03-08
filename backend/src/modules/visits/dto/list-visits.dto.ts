import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  IsArray,
  Min,
  Max,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListVisitsDto {
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

  @IsOptional()
  @Transform(({ value }) => (value ? (Array.isArray(value) ? value : [value]) : undefined))
  @IsArray()
  @IsEnum(['waiting', 'in_treatment', 'completed', 'referred'], { each: true })
  status?: string[];

  @IsOptional()
  @IsEnum(['walk_in', 'emergency', 'appointment', 'follow_up'])
  visitType?: string;

  /** Filter by patient UUID — staff only; students always see own */
  @IsOptional()
  @IsUUID()
  patientId?: string;

  /** Filter by attending staff UUID */
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  /** Free-text search patient name or student_id */
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsEnum(['created_at', 'status', 'visit_type'])
  sortBy?: string = 'created_at';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}
