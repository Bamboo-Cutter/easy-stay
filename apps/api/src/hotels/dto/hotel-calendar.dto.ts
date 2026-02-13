/**
 * 文件说明：酒店月历价格查询 DTO。
 */
import { IsOptional, Matches } from 'class-validator';

export class HotelCalendarDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string; // YYYY-MM
}
