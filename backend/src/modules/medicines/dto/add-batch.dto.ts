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
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  batchNumber: string;

  /** Number of units in this batch */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity: number;

  /** Expiry date as ISO date string (YYYY-MM-DD) */
  @IsDateString()
  expiryDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim())
  notes?: string | null;
}
