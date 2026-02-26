/**
 * 文件说明：该文件定义了接口路由与请求转发逻辑。
 */
import { Controller, Get, Param, Query } from '@nestjs/common';
import { HotelsService } from './hotels.service';
import { ListHotelsDto } from './dto/list-hotels.dto';
import { PriceRangeDto } from './dto/price-range.dto';
import { StayRangeDto } from './dto/stay-range.dto';
import { HotelSuggestionDto } from './dto/hotel-suggestion.dto';
import { HotelCalendarDto } from './dto/hotel-calendar.dto';

@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotels: HotelsService) {}

  // 公开酒店列表查询（支持城市、关键词、分页）
  @Get()
  list(@Query() q: ListHotelsDto) {
    return this.hotels.list(q);
  }

  // 公开搜索建议（目的地/酒店名）
  @Get('suggestions')
  suggestions(@Query() q: HotelSuggestionDto) {
    return this.hotels.suggestions(q);
  }

  // 首页推荐酒店
  @Get('featured')
  featured(@Query('city') city?: string) {
    return this.hotels.featured(city);
  }

  // 首页 Banner（广告位）
  @Get('banners')
  banners() {
    return this.hotels.banners();
  }

  // 列表页筛选元信息（价格区间、标签计数等）
  @Get('filter-metadata')
  filterMetadata(@Query('city') city?: string) {
    return this.hotels.filterMetadata(city);
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

  // 酒店房型报价（按入住离店计算总价）
  @Get(':id/offers')
  offers(@Param('id') id: string, @Query() q: StayRangeDto) {
    return this.hotels.offers(id, q);
  }

  // 酒店月历价格（按天返回最低价）
  @Get(':id/calendar')
  calendar(@Param('id') id: string, @Query() q: HotelCalendarDto) {
    return this.hotels.calendar(id, q);
  }

  // 酒店评分摘要（用于前端评分模块）
  @Get(':id/reviews-summary')
  reviewsSummary(@Param('id') id: string) {
    return this.hotels.reviewsSummary(id);
  }

  // 公开酒店详情查询（仅返回已上架酒店）
  @Get(':id')
  detail(@Param('id') id: string, @Query() q: StayRangeDto) {
    return this.hotels.detail(id, q);
  }
}
