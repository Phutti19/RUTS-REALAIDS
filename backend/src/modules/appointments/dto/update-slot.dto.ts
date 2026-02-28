import {
  IsInt,
  IsString,
  IsBoolean,
  Min,
  Max,
  Matches,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

const TIME_REGEX = /^([0-1]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class UpdateSlotDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime must be HH:MM or HH:MM:SS' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime must be HH:MM or HH:MM:SS' })
  endTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  slotDurationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxPatientsPerSlot?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
