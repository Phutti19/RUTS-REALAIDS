import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class DispenseMedicationDto {
  /** UUID of the medicine to dispense */
  @IsUUID()
  medicineId: string;

  /** Number of units to dispense (batch selected automatically by FIFO) */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  dosageInstruction?: string | null;
}
