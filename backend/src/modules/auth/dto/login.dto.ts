import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
