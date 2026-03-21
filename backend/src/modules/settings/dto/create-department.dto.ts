import { IsString, IsNotEmpty, IsUUID, MinLength, MaxLength, IsOptional, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDepartmentDto {
  @IsUUID()
  @IsNotEmpty()
  facultyId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  @Transform(({ value }) => (value as string)?.trim())
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
