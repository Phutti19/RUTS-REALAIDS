import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListMedicinesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  /** Filter to only low-stock medicines (stock_quantity <= min_stock_level) */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  lowStock?: boolean;

  /** Filter to only medicines with at least one batch expiring within 30 days */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  expiringSoon?: boolean;

  /** Filter by medicine category */
  @IsOptional()
  @IsEnum(['medicine', 'supply', 'equipment'])
  category?: string;

  /** Free-text search on medicine name */
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsEnum(['name', 'stock_quantity', 'category', 'created_at'])
  sortBy?: string = 'name';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'asc';
}
