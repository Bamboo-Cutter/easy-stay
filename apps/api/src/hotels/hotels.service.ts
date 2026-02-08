import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListHotelsDto } from './dto/list-hotels.dto';
import { PriceRangeDto } from './dto/price-range.dto';

@Injectable()
export class HotelsService {
  constructor(private prisma: PrismaService) {}

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

  async detail(id: string) {
    const hotel = await this.prisma.hotels.findFirst({
      where: { id, status: 'APPROVED' },
      include: {
        hotel_images: { orderBy: { sort: 'asc' } },
        hotel_tags: true,
        rooms: true,
        nearby_points: true,
        review_summary: true,
      },
    });
    if (!hotel) throw new NotFoundException('Hotel not found');
    return hotel;
  }

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
}
