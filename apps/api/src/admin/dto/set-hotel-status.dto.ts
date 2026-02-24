/**
 * 文件说明：管理员设置酒店状态 DTO。
 */
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { hotel_status } from '@prisma/client';

export class SetHotelStatusDto {
  @IsEnum(hotel_status)
  status!: hotel_status;

  @IsOptional()
  @IsString()
  reason?: string;
}
