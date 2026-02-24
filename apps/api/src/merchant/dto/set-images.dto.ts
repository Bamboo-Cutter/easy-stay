/**
 * 文件说明：该文件定义了请求参数的数据传输对象（DTO）与校验规则。
 */
import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ImageItem {
  @IsString()
  url!: string;

  @IsInt()
  sort!: number;
}

export class SetImagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageItem)
  items!: ImageItem[];
}
