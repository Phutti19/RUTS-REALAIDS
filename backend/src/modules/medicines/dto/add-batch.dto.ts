import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AddBatchDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุหมายเลข Batch' })
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  batchNumber: string;

  /** Number of units in this batch */
  @Type(() => Number)
  @IsInt({ message: 'จำนวนต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'จำนวนต้องอย่างน้อย 1' })
  @Max(1_000_000, { message: 'จำนวนต้องไม่เกิน 1,000,000' })
  quantity: number;

  /** Expiry date as ISO date string (YYYY-MM-DD) */
  @IsDateString({}, { message: 'วันหมดอายุต้องเป็นรูปแบบ YYYY-MM-DD' })
  expiryDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim())
  notes?: string | null;
}
