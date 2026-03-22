import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFacultyDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อคณะ' })
  @MinLength(1)
  @MaxLength(200, { message: 'ชื่อคณะต้องไม่เกิน 200 ตัวอักษร' })
  @Transform(({ value }) => (value as string)?.trim())
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
