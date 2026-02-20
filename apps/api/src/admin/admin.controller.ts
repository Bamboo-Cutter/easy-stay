/**
 * 文件说明：该文件定义了接口路由与请求转发逻辑。
 */
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AdminService } from './admin.service';
import { SetRoomInventoryDto } from './dto/set-room-inventory.dto';
import { InventoryRangeDto } from './dto/inventory-range.dto';
import { SetHotelStatusDto } from './dto/set-hotel-status.dto';
import { UpdateRejectReasonDto } from './dto/update-reject-reason.dto';
import { user_role } from '@prisma/client';
import { CreateHotelFullDto } from '../merchant/dto/create-hotel-full.dto';
import { UpsertHotelDto } from '../merchant/dto/upsert-hotel.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(user_role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // 查询全部酒店（跨商户）
  @Get('hotels')
  allHotels() {
    return this.admin.allHotels();
  }

  // 管理员创建酒店（对齐 merchant 创建能力）
  @Post('hotels')
  createHotel(@Req() req: any, @Body() dto: CreateHotelFullDto) {
    return this.admin.createHotel(req.user.id, dto);
  }

  // 管理员更新酒店（对齐 merchant 更新能力）
  @Patch('hotels/:id')
  updateHotel(@Param('id') id: string, @Body() dto: UpsertHotelDto) {
    return this.admin.updateHotel(id, dto);
  }

  // 查询待审核酒店列表
  @Get('hotels/pending')
  pending() {
    return this.admin.pendingHotels();
  }

  // 查询单个酒店详情（按 hotel id）
  @Get('hotels/:id')
  hotelDetail(@Param('id') id: string) {
    return this.admin.hotelDetail(id);
  }

  // 查询指定商户名下酒店（按 merchant id）
  @Get('merchants/:merchantId/hotels')
  hotelsByMerchant(@Param('merchantId') merchantId: string) {
    return this.admin.hotelsByMerchant(merchantId);
  }

  // 审核通过指定酒店
  @Post('hotels/:id/approve')
  approve(@Param('id') id: string) {
    return this.admin.approve(id);
  }

  // 审核拒绝指定酒店
  @Post('hotels/:id/reject')
  reject(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.admin.reject(id, body?.reason ?? 'rejected');
  }

  // 管理员修改酒店拒绝原因（仅 REJECTED 状态）
  @Patch('hotels/:id/reject')
  updateRejectReason(@Param('id') id: string, @Body() dto: UpdateRejectReasonDto) {
    return this.admin.updateRejectReason(id, dto.reason);
  }

  // 管理员直接设置酒店状态（不允许设为 DRAFT）
  @Patch('hotels/:id/status')
  setHotelStatus(@Param('id') id: string, @Body() dto: SetHotelStatusDto) {
    return this.admin.setHotelStatus(id, dto);
  }

  // 查询某个房型的库存日历
  @Get('rooms/:roomId/inventory')
  roomInventory(@Param('roomId') roomId: string, @Query() q: InventoryRangeDto) {
    return this.admin.roomInventory(roomId, q);
  }

  // 设置某个房型某一天的库存（总房量/锁房）
  @Post('rooms/:roomId/inventory')
  setRoomInventory(@Param('roomId') roomId: string, @Body() dto: SetRoomInventoryDto) {
    return this.admin.setRoomInventory(roomId, dto);
  }
}
