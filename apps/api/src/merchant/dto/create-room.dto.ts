/**
 * 文件说明：该文件定义了请求参数的数据传输对象（DTO）与校验规则。
 */
import { IsBoolean, IsInt, IsString, Min } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  max_occupancy!: number;

  @IsInt()
  @Min(1)
  total_rooms!: number;

  @IsInt()
  @Min(0)
  base_price!: number;

  @IsBoolean()
  refundable!: boolean;

  @IsBoolean()
  breakfast!: boolean;
}
