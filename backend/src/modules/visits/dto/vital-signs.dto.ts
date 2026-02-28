import { IsOptional, IsNumber, IsString, MaxLength, Min, Max } from 'class-validator';

export class VitalSignsDto {
  /** Body temperature in Celsius */
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(45)
  temperature?: number;

  /** Blood pressure e.g. "120/80" */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bloodPressure?: string;

  /** Heart rate in bpm */
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  heartRate?: number;

  /** Respiratory rate per minute */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  respiratoryRate?: number;

  /** Oxygen saturation % */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  oxygenSaturation?: number;

  /** Weight in kg */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  weight?: number;

  /** Height in cm */
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(250)
  height?: number;
}
