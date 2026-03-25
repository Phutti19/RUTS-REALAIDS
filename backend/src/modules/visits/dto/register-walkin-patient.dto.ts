import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsInt,
  IsDateString,
  IsIn,
  Matches,
  MaxLength,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class RegisterWalkInPatientDto {
  /** Patient type: student, staff_member, or external */
  @IsString()
  @IsIn(['student', 'staff_member', 'external'])
  patientType: 'student' | 'staff_member' | 'external';

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }: { value: string }) => value?.trim())
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName: string;

  /**
   * Student ID — required for students, optional for staff/external.
   * Also used as the initial password for students.
   */
  @ValidateIf((o) => o.patientType === 'student')
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุรหัสนักศึกษา' })
  @Matches(/^[A-Za-z0-9\-]{4,20}$/, {
    message: 'รหัสนักศึกษาต้องเป็นตัวอักษรหรือตัวเลข 4-20 ตัว (อนุญาตเครื่องหมายขีด)',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  studentId?: string;

  @IsOptional()
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }: { value: string }) => value?.trim())
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  faculty?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  department?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  yearOfStudy?: number | null;

  @IsOptional()
  @IsDateString({}, { message: 'วันเกิดต้องเป็นรูปแบบวันที่ที่ถูกต้อง (YYYY-MM-DD)' })
  birthDate?: string | null;

  /** National ID — useful for external visitors */
  @IsOptional()
  @IsString()
  @MaxLength(13)
  @Transform(({ value }: { value: string }) => value?.trim())
  nationalId?: string;

  /** Position/role description — useful for staff_member */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  position?: string | null;
}
