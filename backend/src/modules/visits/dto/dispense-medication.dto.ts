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
  @IsUUID('4', { message: 'กรุณาเลือกยา/เวชภัณฑ์' })
  medicineId: string;

  /** Number of units to dispense (batch selected automatically by FIFO) */
  @Type(() => Number)
  @IsInt({ message: 'จำนวนต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'จำนวนต้องอย่างน้อย 1' })
  @Max(10000, { message: 'จำนวนต้องไม่เกิน 10,000' })
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  dosageInstruction?: string | null;
}
