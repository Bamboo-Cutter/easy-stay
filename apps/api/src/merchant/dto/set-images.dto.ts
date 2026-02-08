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
