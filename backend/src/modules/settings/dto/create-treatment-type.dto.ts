import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTreatmentTypeDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => (value as string)?.trim())
  name: string;
}
