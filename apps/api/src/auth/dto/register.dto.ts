/**
 * 文件说明：该文件定义了请求参数的数据传输对象（DTO）与校验规则。
 */
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { user_role } from '@prisma/client';

export enum RegisterRole {
    MERCHANT = 'MERCHANT',
    ADMIN = 'ADMIN',
  }

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsEnum(user_role)
  role?: user_role; // 不传则默认 MERCHANT
}
