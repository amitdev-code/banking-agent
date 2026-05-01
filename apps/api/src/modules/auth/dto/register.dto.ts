import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';

import type { Role } from '@banking-crm/types';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(['ADMIN', 'MANAGER', 'ANALYST'])
  role!: Role;
}
