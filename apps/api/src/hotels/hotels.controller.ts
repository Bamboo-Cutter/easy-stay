/**
 * 文件说明：该文件定义了接口路由与请求转发逻辑。
 */
import { Controller, Get, Param, Query } from '@nestjs/common';
import { HotelsService } from './hotels.service';
import { ListHotelsDto } from './dto/list-hotels.dto';
import { PriceRangeDto } from './dto/price-range.dto';
import { StayRangeDto } from './dto/stay-range.dto';

@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotels: HotelsService) {}

  // 公开酒店列表查询（支持城市、关键词、分页）
  @Get()
  list(@Query() q: ListHotelsDto) {
    return this.hotels.list(q);
  }

  // 公开酒店详情查询（仅返回已上架酒店）
  @Get(':id')
  detail(@Param('id') id: string, @Query() q: StayRangeDto) {
    return this.hotels.detail(id, q);
  }

  // 房型的价格日历（单房型）
  @Get('rooms/:roomId/prices')
  roomPrices(@Param('roomId') roomId: string, @Query() q: PriceRangeDto) {
    return this.hotels.roomPrices(roomId, q);
  }

  // 查询指定房型在某个入住区间内的库存可用数
  @Get('rooms/:roomId/availability')
  roomAvailability(@Param('roomId') roomId: string, @Query() q: StayRangeDto) {
    return this.hotels.roomAvailability(roomId, q);
  }
}
