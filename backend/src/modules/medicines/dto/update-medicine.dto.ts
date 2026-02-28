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

export class UpdateMedicineDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsEnum(['medicine', 'supply', 'equipment'])
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value: string }) => value?.trim())
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }: { value: string }) => value?.trim())
  unit?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStockLevel?: number;
}
