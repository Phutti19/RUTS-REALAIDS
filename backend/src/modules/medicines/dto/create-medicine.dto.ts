import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateMedicineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @IsEnum(['medicine', 'supply', 'equipment'])
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: string }) => value?.trim())
  description?: string | null;

  /** Unit of measurement e.g. "tablet", "mg", "ml", "piece" */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }: { value: string }) => value?.trim())
  unit?: string | null;

  /** Threshold below which a low-stock alert is triggered */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStockLevel?: number;
}
