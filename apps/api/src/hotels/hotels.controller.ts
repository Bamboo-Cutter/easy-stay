import { Controller, Get, Param, Query } from '@nestjs/common';
import { HotelsService } from './hotels.service';
import { ListHotelsDto } from './dto/list-hotels.dto';
import { PriceRangeDto } from './dto/price-range.dto';

@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotels: HotelsService) {}

  @Get()
  list(@Query() q: ListHotelsDto) {
    return this.hotels.list(q);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.hotels.detail(id);
  }

  // 房型的价格日历（单房型）
  @Get('rooms/:roomId/prices')
  roomPrices(@Param('roomId') roomId: string, @Query() q: PriceRangeDto) {
    return this.hotels.roomPrices(roomId, q);
  }
}
