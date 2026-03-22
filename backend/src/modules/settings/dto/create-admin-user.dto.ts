import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAdminUserDto {
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อ' })
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุนามสกุล' })
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  @MaxLength(72, { message: 'รหัสผ่านต้องไม่เกิน 72 ตัวอักษร' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'รหัสผ่านต้องประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลขอย่างน้อยอย่างละ 1 ตัว',
  })
  password: string;

  @IsIn(['staff', 'admin'], { message: 'บทบาทต้องเป็น staff หรือ admin' })
  role: 'staff' | 'admin';
}
