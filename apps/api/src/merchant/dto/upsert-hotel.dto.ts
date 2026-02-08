import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { hotel_status } from '@prisma/client';

export class UpsertHotelDto {
  @IsString()
  name_cn!: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsString()
  address!: string;

  @IsString()
  city!: string;

  @IsInt()
  @Min(0)
  star!: number;

  @IsString()
  type!: string;

  @IsInt()
  @Min(0)
  open_year!: number;

  // 商户一般只能把状态改到 PENDING / OFFLINE 等，你也可以在 service 限制
  @IsOptional()
  @IsEnum(hotel_status)
  status?: hotel_status;
}
