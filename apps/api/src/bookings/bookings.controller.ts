/**
 * 文件说明：该文件定义了预订相关公开接口（创建、详情、取消）。
 */
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  // 创建预订
  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookings.create(dto);
  }

  // 查询预订详情
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.bookings.detail(id);
  }

  // 取消预订
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.bookings.cancel(id);
  }
}
