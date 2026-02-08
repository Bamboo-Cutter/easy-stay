/**
 * 文件说明：该文件定义了请求参数的数据传输对象（DTO）与校验规则。
 */
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
