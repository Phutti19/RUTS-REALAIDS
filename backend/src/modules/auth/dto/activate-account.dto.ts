import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class ActivateAccountDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;
}
