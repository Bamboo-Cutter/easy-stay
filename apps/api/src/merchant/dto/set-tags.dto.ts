/**
 * 文件说明：该文件定义了请求参数的数据传输对象（DTO）与校验规则。
 */
import { IsArray, IsString } from 'class-validator';

export class SetTagsDto {
  @IsArray()
  @IsString({ each: true })
  tags!: string[];
}
