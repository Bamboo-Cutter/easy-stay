import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { user_role } from '@prisma/client';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AdminService } from './admin.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(user_role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('hotels/pending')
  pending() {
    return this.admin.pendingHotels();
  }

  @Post('hotels/:id/approve')
  approve(@Param('id') id: string) {
    return this.admin.approve(id);
  }

  @Post('hotels/:id/reject')
  reject(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.admin.reject(id, body?.reason ?? 'rejected');
  }
}
