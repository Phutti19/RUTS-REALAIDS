import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุ Refresh Token' })
  refreshToken: string;
}
