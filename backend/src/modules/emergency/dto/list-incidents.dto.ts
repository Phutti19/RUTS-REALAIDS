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

export class ListIncidentsDto {
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
  @Transform(({ value }) => (value ? (Array.isArray(value) ? value : String(value).split(',')) : undefined))
  @IsArray()
  @IsEnum(['pending', 'accepted', 'in_progress', 'completed', 'cancelled'], { each: true })
  status?: string[];

  @IsOptional()
  @IsEnum(['injury', 'illness', 'accident', 'fainting', 'other'])
  incidentType?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity?: string;

  /** Filter: incidents created on/after this date (ISO 8601) */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Filter: incidents created on/before this date (ISO 8601) */
  @IsOptional()
  @IsDateString()
  to?: string;

  /** Filter by reporter UUID — staff only; students always see own */
  @IsOptional()
  @IsUUID()
  reporterId?: string;

  @IsOptional()
  @IsEnum(['created_at', 'severity', 'status', 'incident_type'])
  sortBy?: string = 'created_at';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  /** Free-text search in description */
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;
}
