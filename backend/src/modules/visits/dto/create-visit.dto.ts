import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  MaxLength,
  IsObject,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { VitalSignsDto } from './vital-signs.dto';

export class CreateVisitDto {
  /** UUID of the patient (user) */
  @IsUUID()
  patientId: string;

  /** Linked emergency incident (optional) */
  @IsOptional()
  @IsUUID()
  incidentId?: string;

  @IsEnum(['walk_in', 'emergency', 'appointment', 'follow_up'], {
    message: 'visitType must be one of: walk_in, emergency, appointment, follow_up',
  })
  visitType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim())
  chiefComplaint: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => VitalSignsDto)
  vitalSigns?: VitalSignsDto;
}
