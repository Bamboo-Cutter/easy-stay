/**
 * 文件说明：商家设置酒店状态 DTO。
 */
import { IsEnum } from 'class-validator';
import { hotel_status } from '@prisma/client';

export class SetHotelStatusDto {
  @IsEnum(hotel_status)
  status!: hotel_status;
}
