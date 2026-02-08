import { Controller, Get, Param, Query } from '@nestjs/common';
import { HotelService } from './hotel.service';

@Controller('hotel')
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  // 获取酒店列表，可按 merchant_id 筛选
  @Get()
  async getHotels(@Query('merchant_id') merchant_id?: string) {
    const list = await this.hotelService.findAll(merchant_id);
    return { code: 200, message: 'success', data: list };
  }

  // 获取单个酒店
  @Get(':id')
  async getHotel(@Param('id') id: string) {
    const hotel = await this.hotelService.findOne(id);
    if (!hotel) {
      return { code: 404, message: 'Hotel not found' };
    }
    return { code: 200, message: 'success', data: hotel };
  }
}
