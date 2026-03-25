import {
  IsUUID,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAppointmentDto {
  /** The appointment_slots.id to book */
  @IsUUID('4', { message: 'กรุณาเลือกช่วงเวลานัดหมาย' })
  slotId: string;

  /**
   * Date to book in ISO format (YYYY-MM-DD).
   * Must match the slot's day_of_week.
   */
  @IsDateString({}, { message: 'วันที่ต้องเป็นรูปแบบ YYYY-MM-DD' })
  date: string;

  /** Reason for the appointment (optional — defaults to notes if omitted) */
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'เหตุผลต้องไม่เกิน 255 ตัวอักษร' })
  @Transform(({ value }: { value: string }) => value?.trim())
  reason?: string;

  /** Optional notes from the patient */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim())
  notes?: string | null;
}
