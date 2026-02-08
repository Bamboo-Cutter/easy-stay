/**
 * 文件说明：该文件定义了创建预订请求的 DTO 与校验规则。
 */
import { Transform } from 'class-transformer';
import { IsISO8601, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  hotel_id!: string;

  @IsString()
  room_id!: string;

  @IsISO8601()
  check_in!: string;

  @IsISO8601()
  check_out!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  rooms_count!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  guest_count!: number;

  @IsString()
  contact_name!: string;

  @IsString()
  contact_phone!: string;

  @IsOptional()
  @IsString()
  user_id?: string;
}
