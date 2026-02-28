import { IsEnum, IsDateString } from 'class-validator';

export class ExportPdfDto {
  /** 'daily' = one day; 'monthly' = entire calendar month */
  @IsEnum(['daily', 'monthly'])
  type: 'daily' | 'monthly';

  /**
   * For daily: the specific date (YYYY-MM-DD).
   * For monthly: any date within the target month (YYYY-MM-DD).
   */
  @IsDateString()
  date: string;
}
