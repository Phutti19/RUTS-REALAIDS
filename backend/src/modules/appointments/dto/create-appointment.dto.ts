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
  @IsUUID()
  slotId: string;

  /**
   * Date to book in ISO format (YYYY-MM-DD).
   * Must match the slot's day_of_week.
   */
  @IsDateString()
  date: string;

  /** Optional notes from the patient */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim())
  notes?: string | null;
}
