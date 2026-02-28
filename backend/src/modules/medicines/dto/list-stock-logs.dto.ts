import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListStockLogsDto {
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
  limit?: number = 50;

  /** Filter by stock action type */
  @IsOptional()
  @IsEnum(['received', 'dispensed', 'expired', 'adjusted'])
  action?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
