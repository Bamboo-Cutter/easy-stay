/**
 * 文件说明：创建酒店及其关联子表（图片、标签、房型、临近点）的一体化 DTO。
 */
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { hotel_status } from '@prisma/client';

class HotelImageItemDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}

class NearbyPointItemDto {
  @IsString()
  type!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distance_km?: number;
}

class RoomItemDto {
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomPriceItemDto)
  prices?: RoomPriceItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomInventoryItemDto)
  inventory_daily?: RoomInventoryItemDto[];
}

class RoomPriceItemDto {
  @IsISO8601()
  date!: string;

  @IsInt()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  promo_type?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  promo_value?: number;
}

class RoomInventoryItemDto {
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

export class CreateHotelFullDto {
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

  @IsOptional()
  @IsEnum(hotel_status)
  status?: hotel_status;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HotelImageItemDto)
  images?: HotelImageItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomItemDto)
  rooms?: RoomItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NearbyPointItemDto)
  nearby_points?: NearbyPointItemDto[];
}
