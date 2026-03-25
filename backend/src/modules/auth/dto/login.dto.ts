import { IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  /** Accepts email address or student ID (12-digit) */
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุอีเมลหรือรหัสนักศึกษา' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุรหัสผ่าน' })
  password: string;
}
