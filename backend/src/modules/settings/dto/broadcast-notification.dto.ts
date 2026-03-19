import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class BroadcastNotificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => (value as string)?.trim())
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @Transform(({ value }) => (value as string)?.trim())
  message: string;

  @IsOptional()
  @IsString()
  @IsIn(['all', 'staff', 'student'])
  target?: string = 'all';
}
