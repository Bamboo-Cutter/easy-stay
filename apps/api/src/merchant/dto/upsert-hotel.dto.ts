/**
 * 文件说明：该文件定义了请求参数的数据传输对象（DTO）与校验规则。
 */
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { hotel_status } from '@prisma/client';
import { HotelImageItemDto, NearbyPointItemDto, RoomItemDto } from './create-hotel-full.dto';

export class UpsertHotelDto {
  @IsOptional()
  @IsString()
  name_cn?: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  star?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  open_year?: number;

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
