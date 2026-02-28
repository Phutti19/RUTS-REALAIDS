import {
  IsEnum,
  IsString,
  IsOptional,
  MaxLength,
  IsObject,
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
  @IsObject()
  @ValidateNested()
  @Type(() => VitalSignsDto)
  vitalSigns?: VitalSignsDto;

  @IsOptional()
  @IsEnum(['waiting', 'in_treatment', 'completed', 'referred'], {
    message: 'status must be one of: waiting, in_treatment, completed, referred',
  })
  status?: string;
}
