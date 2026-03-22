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
  @IsNotEmpty({ message: 'กรุณาระบุชื่อยา/เวชภัณฑ์' })
  @MaxLength(200, { message: 'ชื่อยาต้องไม่เกิน 200 ตัวอักษร' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.trim())
  genericName?: string | null;

  @IsEnum(['medicine', 'supply', 'equipment'], {
    message: 'ประเภทต้องเป็น medicine, supply หรือ equipment',
  })
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

  /** Storage location e.g. "Cabinet A", "Shelf 3" */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  location?: string | null;

  /** Threshold below which a low-stock alert is triggered */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStockLevel?: number;
}
