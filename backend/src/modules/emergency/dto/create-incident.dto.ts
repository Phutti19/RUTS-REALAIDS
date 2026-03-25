import {
  IsEnum,
  IsNotEmpty,
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
    message: 'ประเภทเหตุฉุกเฉินต้องเป็น injury, illness, accident, fainting หรือ other',
  })
  incidentType: string;

  @IsEnum(['low', 'medium', 'high', 'critical'], {
    message: 'ระดับความรุนแรงต้องเป็น low, medium, high หรือ critical',
  })
  severity: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  description?: string | null;

  @IsNotEmpty({ message: 'กรุณาระบุละติจูด' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNotEmpty({ message: 'กรุณาระบุลองจิจูด' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  locationName?: string | null;
}
