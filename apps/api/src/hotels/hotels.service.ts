/**
 * 文件说明：该文件定义了核心业务逻辑与数据库访问流程。
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListHotelsDto } from './dto/list-hotels.dto';
import { PriceRangeDto } from './dto/price-range.dto';
import { StayRangeDto } from './dto/stay-range.dto';

@Injectable()
export class HotelsService {
  constructor(private prisma: PrismaService) {}

  // 查询公开酒店列表并返回分页结果
  async list(q: ListHotelsDto) {
    const skip = (q.page - 1) * q.limit;

    const where: any = {
      status: 'APPROVED',
      ...(q.city ? { city: q.city } : {}),
      ...(q.keyword
        ? {
            OR: [
              { name_cn: { contains: q.keyword, mode: 'insensitive' } },
              { name_en: { contains: q.keyword, mode: 'insensitive' } },
              { address: { contains: q.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.hotels.findMany({
        where,
        skip,
        take: q.limit,
        orderBy: { created_at: 'desc' },
        include: {
          hotel_images: { orderBy: { sort: 'asc' } },
          hotel_tags: true,
          review_summary: true,
        },
      }),
      this.prisma.hotels.count({ where }),
    ]);

    return { items, total, page: q.page, limit: q.limit };
  }

  // 查询单个酒店详情，若未上架或不存在则抛 404
  async detail(id: string, q: StayRangeDto) {
    const hotel = await this.prisma.hotels.findFirst({
      where: { id, status: 'APPROVED' },
      include: {
        hotel_images: { orderBy: { sort: 'asc' } },
        hotel_tags: true,
        rooms: { orderBy: { base_price: 'asc' } },
        nearby_points: true,
        review_summary: true,
      },
    });
    if (!hotel) throw new NotFoundException('Hotel not found');

    if (!q.check_in || !q.check_out) return hotel;

    const roomPrices = await Promise.all(
      hotel.rooms.map(async (room) => {
        const availability = await this.roomAvailability(room.id, q);
        return {
          room_id: room.id,
          room_name: room.name,
          base_price: room.base_price,
          available_rooms: availability.available_rooms,
          max_occupancy: room.max_occupancy,
        };
      }),
    );

    return { ...hotel, room_price_list: roomPrices.sort((a, b) => a.base_price - b.base_price) };
  }

  // 查询指定房型的价格日历，可按时间区间过滤
  async roomPrices(roomId: string, q: PriceRangeDto) {
    const where: any = { room_id: roomId };
    if (q.from || q.to) {
      where.date = {};
      if (q.from) where.date.gte = new Date(q.from);
      if (q.to) where.date.lte = new Date(q.to);
    }
    return this.prisma.price_calendar.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  // 查询指定房型在入住区间内的最小可售房量
  async roomAvailability(roomId: string, q: StayRangeDto) {
    const room = await this.prisma.rooms.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (!q.check_in || !q.check_out) {
      return { room_id: roomId, available_rooms: room.total_rooms };
    }

    const checkIn = this.startOfDay(q.check_in);
    const checkOut = this.startOfDay(q.check_out);
    const nights = this.getStayDates(checkIn, checkOut);
    const requiredRooms = q.rooms_count ?? 1;

    const inv = await this.prisma.room_inventory_daily.findMany({
      where: { room_id: roomId, date: { in: nights } },
    });
    const invMap = new Map(inv.map((x) => [x.date.getTime(), x]));

    let minAvailable = Number.MAX_SAFE_INTEGER;
    for (const d of nights) {
      const row = invMap.get(d.getTime());
      const total = row?.total_rooms ?? room.total_rooms;
      const available = total - (row?.reserved_rooms ?? 0) - (row?.blocked_rooms ?? 0);
      if (available < minAvailable) minAvailable = available;
    }

    if (!Number.isFinite(minAvailable)) minAvailable = room.total_rooms;
    return {
      room_id: roomId,
      required_rooms: requiredRooms,
      available_rooms: minAvailable,
      is_available: minAvailable >= requiredRooms,
    };
  }

  private startOfDay(value: string | Date) {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // check_out 为离店日，不计入可入住夜晚
  private getStayDates(checkIn: Date, checkOut: Date) {
    const dates: Date[] = [];
    const cursor = new Date(checkIn);
    while (cursor < checkOut) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }
}
