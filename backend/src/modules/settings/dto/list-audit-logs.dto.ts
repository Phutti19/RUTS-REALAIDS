import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListAuditLogsDto {
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
  action?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value as string)?.trim())
  entityType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value as string)?.trim())
  search?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
