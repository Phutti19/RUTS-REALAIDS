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
  @IsInt({ message: 'วันในสัปดาห์ต้องเป็นจำนวนเต็ม (0=อาทิตย์ ถึง 6=เสาร์)' })
  @Min(0, { message: 'วันในสัปดาห์ต้องเป็น 0-6 (0=อาทิตย์ ถึง 6=เสาร์)' })
  @Max(6, { message: 'วันในสัปดาห์ต้องเป็น 0-6 (0=อาทิตย์ ถึง 6=เสาร์)' })
  dayOfWeek: number;

  /** Slot start time in HH:MM format */
  @IsString()
  @Matches(TIME_REGEX, { message: 'เวลาเริ่มต้องเป็นรูปแบบ HH:MM เช่น 08:00' })
  startTime: string;

  /** Slot end time in HH:MM format */
  @IsString()
  @Matches(TIME_REGEX, { message: 'เวลาสิ้นสุดต้องเป็นรูปแบบ HH:MM เช่น 12:00' })
  endTime: string;

  /** Duration in minutes for each sub-slot within the window */
  @Type(() => Number)
  @IsInt({ message: 'ระยะเวลาต้องเป็นจำนวนเต็ม (นาที)' })
  @Min(5, { message: 'ระยะเวลาต้องอย่างน้อย 5 นาที' })
  @Max(480, { message: 'ระยะเวลาต้องไม่เกิน 480 นาที' })
  slotDurationMinutes: number;

  /** Maximum number of patients that can book this slot on a given day */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxPatientsPerSlot?: number;
}
