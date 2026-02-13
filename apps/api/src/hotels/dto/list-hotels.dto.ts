/**
 * 文件说明：该文件定义了请求参数的数据传输对象（DTO）与校验规则。
 */
import { Transform } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListHotelsDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit: number = 20;

  @IsOptional()
  @IsISO8601()
  check_in?: string;

  @IsOptional()
  @IsISO8601()
  check_out?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  rooms_count?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  min_price?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  max_price?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(5)
  min_star?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(5)
  max_star?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @Min(0)
  min_rating?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  breakfast?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  refundable?: boolean;

  @IsOptional()
  @IsString()
  sort?:
    | 'recommended'
    | 'price_asc'
    | 'price_desc'
    | 'rating_desc'
    | 'star_desc'
    | 'newest';
}
