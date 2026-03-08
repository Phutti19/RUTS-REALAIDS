import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AdjustStockDto {
  /** Positive = add, negative = remove. Cannot be 0. */
  @Type(() => Number)
  @IsInt()
  @Min(-1_000_000)
  @Max(1_000_000)
  quantityChange: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim())
  note?: string;
}
