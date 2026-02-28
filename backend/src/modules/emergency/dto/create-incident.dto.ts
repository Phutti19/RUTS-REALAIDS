import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateIncidentDto {
  @IsEnum(['injury', 'illness', 'accident', 'fainting', 'other'], {
    message: 'incidentType must be one of: injury, illness, accident, fainting, other',
  })
  incidentType: string;

  @IsEnum(['low', 'medium', 'high', 'critical'], {
    message: 'severity must be one of: low, medium, high, critical',
  })
  severity: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  description?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
