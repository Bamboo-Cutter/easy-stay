/**
 * 文件说明：该文件定义了查询库存日历区间的 DTO。
 */
import { IsISO8601, IsOptional } from 'class-validator';

export class InventoryRangeDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
