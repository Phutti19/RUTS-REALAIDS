import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class BroadcastNotificationDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุหัวข้อประกาศ' })
  @MaxLength(200, { message: 'หัวข้อต้องไม่เกิน 200 ตัวอักษร' })
  @Transform(({ value }) => (value as string)?.trim())
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุเนื้อหาประกาศ' })
  @MaxLength(1000, { message: 'เนื้อหาต้องไม่เกิน 1,000 ตัวอักษร' })
  @Transform(({ value }) => (value as string)?.trim())
  message: string;

  @IsOptional()
  @IsString()
  @IsIn(['all', 'staff', 'student'], {
    message: 'กลุ่มเป้าหมายต้องเป็น all, staff หรือ student',
  })
  target?: string = 'all';
}
