/**
 * 文件说明：该文件定义了酒店详情页“入住/离店”查询参数 DTO。
 */
import { Transform } from 'class-transformer';
import { IsISO8601, IsInt, IsOptional, Min } from 'class-validator';

export class StayRangeDto {
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
  rooms_count: number = 1;
}
