import {
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  MaxLength,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateCertificateForVisitDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุการวินิจฉัย' })
  @MaxLength(1000, { message: 'การวินิจฉัยต้องไม่เกิน 1,000 ตัวอักษร' })
  @Transform(({ value }: { value: string }) => value?.trim())
  diagnosisText: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  recommendation?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'จำนวนวันพักต้องเป็นจำนวนเต็ม' })
  @Min(0, { message: 'จำนวนวันพักต้องไม่น้อยกว่า 0' })
  @Max(365, { message: 'จำนวนวันพักต้องไม่เกิน 365 วัน' })
  restDays?: number | null;

  @IsOptional()
  @IsDateString({}, { message: 'วันเริ่มพักต้องเป็นรูปแบบ YYYY-MM-DD' })
  restStartDate?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'วันสิ้นสุดพักต้องเป็นรูปแบบ YYYY-MM-DD' })
  restEndDate?: string | null;
}
