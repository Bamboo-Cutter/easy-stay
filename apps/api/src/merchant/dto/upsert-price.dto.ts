/**
 * 文件说明：该文件定义了请求参数的数据传输对象（DTO）与校验规则。
 */
import { IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

export class UpsertPriceDto {
  @IsISO8601()
  date!: string; // 例如 2026-02-02T00:00:00.000Z

  @IsInt()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  promo_type?: string;

  @IsOptional()
  @IsInt()
  promo_value?: number;
}
