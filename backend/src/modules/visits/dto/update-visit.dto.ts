import {
  IsEnum,
  IsString,
  IsOptional,
  MaxLength,
  IsObject,
  IsBoolean,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { VitalSignsDto } from './vital-signs.dto';

export class UpdateVisitDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  diagnosis?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  treatmentNotes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  illnessHistory?: string | null;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => VitalSignsDto)
  vitalSigns?: VitalSignsDto;

  @IsOptional()
  @IsBoolean()
  woundCare?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(72)
  restHours?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  consultationTypes?: string[];

  @IsOptional()
  @IsBoolean()
  isReferred?: boolean;

  @IsOptional()
  @IsUUID()
  treatmentTypeId?: string | null;

  @IsOptional()
  @IsEnum(['waiting', 'in_treatment', 'completed', 'referred'], {
    message: 'สถานะต้องเป็น waiting, in_treatment, completed หรือ referred',
  })
  status?: string;
}
