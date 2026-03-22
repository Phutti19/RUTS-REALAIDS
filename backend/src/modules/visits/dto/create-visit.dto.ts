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
  @IsUUID('4', { message: 'รหัสผู้ป่วยไม่ถูกต้อง' })
  patientId: string;

  /** Linked emergency incident (optional) */
  @IsOptional()
  @IsUUID()
  incidentId?: string;

  @IsEnum(['walk_in', 'emergency', 'appointment', 'follow_up'], {
    message: 'ประเภทการเข้ารับบริการต้องเป็น walk_in, emergency, appointment หรือ follow_up',
  })
  visitType: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุอาการสำคัญ' })
  @MaxLength(500, { message: 'อาการสำคัญต้องไม่เกิน 500 ตัวอักษร' })
  @Transform(({ value }: { value: string }) => value?.trim())
  chiefComplaint: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => VitalSignsDto)
  vitalSigns?: VitalSignsDto;
}
