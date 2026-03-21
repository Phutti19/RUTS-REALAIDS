import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['student', 'staff', 'admin'])
  role?: 'student' | 'staff' | 'admin';

  @IsOptional()
  @Transform(({ value }: { value: string }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  /**
   * Filter by patient type:
   * - student: role=student AND student_id IS NOT NULL
   * - staff_member: role=staff (non-admin staff registered as patients)
   * - external: role=student AND student_id IS NULL (external persons)
   */
  @IsOptional()
  @IsEnum(['student', 'staff_member', 'external'])
  patientType?: 'student' | 'staff_member' | 'external';

  /** Search by name, email, or student_id */
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsEnum(['created_at', 'first_name', 'last_name', 'email', 'role'])
  sortBy?: string = 'created_at';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}
