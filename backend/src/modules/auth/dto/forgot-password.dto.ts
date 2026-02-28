import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;
}
