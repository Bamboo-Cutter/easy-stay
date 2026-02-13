/**
 * 文件说明：公开搜索建议 DTO。
 */
import { IsOptional, IsString, MinLength } from 'class-validator';

export class HotelSuggestionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  keyword?: string;

  @IsOptional()
  @IsString()
  city?: string;
}
