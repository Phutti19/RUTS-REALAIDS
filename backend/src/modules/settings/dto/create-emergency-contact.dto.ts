import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class CreateEmergencyContactDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุชื่อหน่วยงาน' })
  name: string;

  @IsIn(['hospital', 'police', 'rescue', 'fire', 'other'], {
    message: 'ประเภทต้องเป็น hospital, police, rescue, fire หรือ other',
  })
  category: 'hospital' | 'police' | 'rescue' | 'fire' | 'other';

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุเบอร์โทรศัพท์' })
  phone: string;

  @IsOptional()
  @IsString()
  note?: string;
}
