import { IsString, IsNotEmpty, IsUUID, MinLength, MaxLength, IsOptional, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDepartmentDto {
  @IsUUID('4', { message: 'กรุณาเลือกคณะ' })
  @IsNotEmpty({ message: 'กรุณาเลือกคณะ' })
  facultyId: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อสาขา' })
  @MinLength(1)
  @MaxLength(200, { message: 'ชื่อสาขาต้องไม่เกิน 200 ตัวอักษร' })
  @Transform(({ value }) => (value as string)?.trim())
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
