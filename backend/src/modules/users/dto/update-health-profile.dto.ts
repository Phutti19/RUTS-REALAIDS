import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

enum BloodTypeEnum {
  A_POS = 'A+',
  A_NEG = 'A-',
  B_POS = 'B+',
  B_NEG = 'B-',
  AB_POS = 'AB+',
  AB_NEG = 'AB-',
  O_POS = 'O+',
  O_NEG = 'O-',
  A = 'A',
  B = 'B',
  AB = 'AB',
  O = 'O',
}

export class UpdateHealthProfileDto {
  @IsOptional()
  @IsEnum(BloodTypeEnum, { message: 'กรุ๊ปเลือดไม่ถูกต้อง กรุณาใช้ A, B, AB, O, A+, A-, B+, B-, AB+, AB-, O+ หรือ O-' })
  bloodType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  allergies?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  chronicDiseases?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  emergencyContactName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  emergencyContactPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  emergencyContactRelation?: string | null;
}
