/**
 * 文件说明：该文件定义了请求参数的数据传输对象（DTO）与校验规则。
 */
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { user_role } from '@prisma/client';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_POLICY_REGEX } from '../password-policy';

export enum RegisterRole {
    USER = 'USER',
    MERCHANT = 'MERCHANT',
    ADMIN = 'ADMIN',
  }

export class RegisterDto {
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsEmail()
  @MaxLength(100)
  email!: string;

  @Transform(({ value }) => String(value ?? ''))
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_POLICY_REGEX, {
    message: '密码需包含大小写字母、数字和特殊字符，且不少于8位',
  })
  password!: string;

  @IsOptional()
  @IsEnum(user_role)
  role?: user_role; // 不传则默认 USER
}
