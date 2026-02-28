import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class UpdateEmergencyContactDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsIn(['hospital', 'police', 'rescue', 'fire', 'other'])
  category?: 'hospital' | 'police' | 'rescue' | 'fire' | 'other';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
