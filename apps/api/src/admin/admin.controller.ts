/**
 * 文件说明：该文件定义了接口路由与请求转发逻辑。
 */
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { user_role } from '@prisma/client';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AdminService } from './admin.service';
import { SetRoomInventoryDto } from './dto/set-room-inventory.dto';
import { InventoryRangeDto } from './dto/inventory-range.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(user_role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // 查询待审核酒店列表
  @Get('hotels/pending')
  pending() {
    return this.admin.pendingHotels();
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
