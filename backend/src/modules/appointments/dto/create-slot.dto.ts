import {
  IsInt,
  IsString,
  Min,
  Max,
  Matches,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

/** HH:MM or HH:MM:SS */
const TIME_REGEX = /^([0-1]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateSlotDto {
  /** Staff member who owns this slot. If omitted, defaults to the calling staff user. */
  @IsOptional()
  @IsUUID()
  staffId?: string;

  /**
   * Day of week: 0=Sunday, 1=Monday … 6=Saturday
   * (matches PostgreSQL EXTRACT(DOW FROM date))
   */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  /** Slot start time in HH:MM format */
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime must be HH:MM or HH:MM:SS' })
  startTime: string;

  /** Slot end time in HH:MM format */
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime must be HH:MM or HH:MM:SS' })
  endTime: string;

  /** Duration in minutes for each sub-slot within the window */
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  slotDurationMinutes: number;

  /** Maximum number of patients that can book this slot on a given day */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxPatientsPerSlot?: number;
}
