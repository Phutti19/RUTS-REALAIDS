import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AdjustStockDto {
  /** Positive = add, negative = remove. Cannot be 0. */
  @Type(() => Number)
  @IsInt({ message: 'จำนวนต้องเป็นจำนวนเต็ม' })
  @Min(-1_000_000)
  @Max(1_000_000)
  quantityChange: number;

  /** Optional: link this adjustment to a specific batch */
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim())
  note?: string;
}
