import { IsOptional, IsString, IsInt, IsBoolean, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListLoginAttemptsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value as string)?.trim())
  email?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
