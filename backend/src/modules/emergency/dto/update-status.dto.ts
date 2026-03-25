import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateStatusDto {
  @IsEnum(['in_progress', 'completed', 'cancelled'], {
    message: 'สถานะต้องเป็น in_progress, completed หรือ cancelled',
  })
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: string }) => value?.trim() || null)
  note?: string | null;
}
