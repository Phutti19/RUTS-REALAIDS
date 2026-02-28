import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class CreateEmergencyContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(['hospital', 'police', 'rescue', 'fire', 'other'])
  category: 'hospital' | 'police' | 'rescue' | 'fire' | 'other';

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsString()
  note?: string;
}
