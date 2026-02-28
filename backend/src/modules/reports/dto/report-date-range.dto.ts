import { IsDateString, IsOptional } from 'class-validator';

export class ReportDateRangeDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
