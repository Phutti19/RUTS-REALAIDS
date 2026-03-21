import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';

export class ActivateAccountDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;
}
