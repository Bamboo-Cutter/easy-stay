/**
 * 文件说明：该文件定义了管理员设置单日房量库存的 DTO。
 */
import { IsISO8601, IsInt, IsOptional, Min } from 'class-validator';

export class SetRoomInventoryDto {
  @IsISO8601()
  date!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  total_rooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  blocked_rooms?: number;
}
