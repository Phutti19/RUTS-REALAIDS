import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';

export class ActivateAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุรหัสนักศึกษา' })
  studentId: string;

  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  @MaxLength(72, { message: 'รหัสผ่านต้องไม่เกิน 72 ตัวอักษร' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'รหัสผ่านต้องประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลขอย่างน้อยอย่างละ 1 ตัว',
  })
  password: string;
}
