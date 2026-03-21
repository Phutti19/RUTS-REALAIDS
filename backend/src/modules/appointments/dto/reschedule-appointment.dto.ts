import { IsUUID, IsNotEmpty, IsString, IsOptional, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RescheduleAppointmentDto {
  @IsUUID()
  @IsNotEmpty()
  slotId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim())
  reason?: string;
}
