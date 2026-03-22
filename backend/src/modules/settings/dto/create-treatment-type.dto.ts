import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTreatmentTypeDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อประเภทการรักษา' })
  @MinLength(1)
  @MaxLength(100, { message: 'ชื่อต้องไม่เกิน 100 ตัวอักษร' })
  @Transform(({ value }) => (value as string)?.trim())
  name: string;
}
