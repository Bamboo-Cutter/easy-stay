/**
 * 文件说明：该文件定义了接口路由与请求转发逻辑。
 */
import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { user_role } from '@prisma/client';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { MerchantService } from './merchant.service';
import { UpsertHotelDto } from './dto/upsert-hotel.dto';
import { CreateHotelFullDto } from './dto/create-hotel-full.dto';
import { SetImagesDto } from './dto/set-images.dto';
import { SetTagsDto } from './dto/set-tags.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpsertPriceDto } from './dto/upsert-price.dto';
import { SetHotelStatusDto } from './dto/set-hotel-status.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(user_role.MERCHANT, user_role.ADMIN) // 管理员也能看商户接口（可选）
@Controller('merchant')
export class MerchantController {
  constructor(private readonly merchant: MerchantService) {}

  // 获取当前商家信息
  @Get('me')
  me(@Req() req: any) {
    return this.merchant.me(req.user.id);
  }

  // 获取当前商家的酒店列表
  @Get('hotels')
  myHotels(@Req() req: any) {
    return this.merchant.myHotels(req.user.id);
  }

  // 获取当前商家名下某个酒店的详情
  @Get('hotels/:id')
  myHotelDetail(@Req() req: any, @Param('id') id: string) {
    return this.merchant.myHotelDetail(req.user.id, id);
  }

  // 创建酒店草稿
  @Post('hotels')
  createHotel(@Req() req: any, @Body() dto: CreateHotelFullDto) {
    return this.merchant.createHotel(req.user.id, dto);
  }

  // 更新酒店信息（可用于提交审核）
  @Patch('hotels/:id')
  updateHotel(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertHotelDto) {
    return this.merchant.updateHotel(req.user.id, id, dto);
  }

  // 单独修改酒店状态
  @Patch('hotels/:id/status')
  setHotelStatus(@Req() req: any, @Param('id') id: string, @Body() dto: SetHotelStatusDto) {
    return this.merchant.setHotelStatus(req.user.id, id, dto);
  }

  // 覆盖设置酒店图片
  @Post('hotels/:id/images')
  setImages(@Req() req: any, @Param('id') id: string, @Body() dto: SetImagesDto) {
    return this.merchant.setImages(req.user.id, id, dto);
  }

  // 覆盖设置酒店标签
  @Post('hotels/:id/tags')
  setTags(@Req() req: any, @Param('id') id: string, @Body() dto: SetTagsDto) {
    return this.merchant.setTags(req.user.id, id, dto);
  }

  // 新增酒店房型
  @Post('hotels/:id/rooms')
  createRoom(@Req() req: any, @Param('id') id: string, @Body() dto: CreateRoomDto) {
    return this.merchant.createRoom(req.user.id, id, dto);
  }

  // 房型价格日历写入（按 room + date upsert）
  @Post('rooms/:roomId/prices')
  upsertPrice(@Req() req: any, @Param('roomId') roomId: string, @Body() dto: UpsertPriceDto) {
    return this.merchant.upsertRoomPrice(req.user.id, roomId, dto);
  }
}
