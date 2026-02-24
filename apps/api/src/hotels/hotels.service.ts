/**
 * 文件说明：该文件定义了核心业务逻辑与数据库访问流程。
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListHotelsDto } from './dto/list-hotels.dto';
import { PriceRangeDto } from './dto/price-range.dto';
import { StayRangeDto } from './dto/stay-range.dto';
import { HotelSuggestionDto } from './dto/hotel-suggestion.dto';
import { HotelCalendarDto } from './dto/hotel-calendar.dto';

@Injectable()
export class HotelsService {
  constructor(private prisma: PrismaService) {}

  // 查询公开酒店列表并返回分页结果
  async list(q: ListHotelsDto) {
    const where: any = {
      status: 'APPROVED',
      ...(q.city ? { city: q.city } : {}),
      ...(q.min_star !== undefined || q.max_star !== undefined
        ? {
            star: {
              ...(q.min_star !== undefined ? { gte: q.min_star } : {}),
              ...(q.max_star !== undefined ? { lte: q.max_star } : {}),
            },
          }
        : {}),
      ...(q.min_rating !== undefined ? { review_summary: { is: { rating: { gte: q.min_rating } } } } : {}),
      ...(q.keyword
        ? {
            OR: [
              { name_cn: { contains: q.keyword, mode: 'insensitive' } },
              { name_en: { contains: q.keyword, mode: 'insensitive' } },
              { address: { contains: q.keyword, mode: 'insensitive' } },
              {
                nearby_points: {
                  some: {
                    name: { contains: q.keyword, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
      ...(q.breakfast ? { rooms: { some: { breakfast: true } } } : {}),
      ...(q.refundable ? { rooms: { some: { refundable: true } } } : {}),
      ...(q.nearby_type || q.nearby_keyword
        ? {
            nearby_points: {
              some: {
                ...(q.nearby_type ? { type: q.nearby_type } : {}),
                ...(q.nearby_keyword
                  ? { name: { contains: q.nearby_keyword, mode: 'insensitive' } }
                  : {}),
              },
            },
          }
        : {}),
    };

    const allItems = await this.prisma.hotels.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        hotel_images: { orderBy: { sort: 'asc' } },
        hotel_tags: true,
        nearby_points: true,
        review_summary: true,
        rooms: {
          orderBy: { base_price: 'asc' },
          include: {
            price_calendar: q.check_in && q.check_out
              ? {
                  where: {
                    date: {
                      gte: this.startOfDay(q.check_in),
                      lt: this.startOfDay(q.check_out),
                    },
                  },
                }
              : false,
            inventory_daily: q.check_in && q.check_out
              ? {
                  where: {
                    date: {
                      gte: this.startOfDay(q.check_in),
                      lt: this.startOfDay(q.check_out),
                    },
                  },
                }
              : false,
          },
        },
      },
    });

    const roomsCount = q.rooms_count ?? 1;
    const requiredGuests =
      q.adults !== undefined || q.children !== undefined
        ? (q.adults ?? 0) + (q.children ?? 0)
        : 0;
    const withComputed = allItems.map((hotel) => {
      const roomMetrics = this.computeRoomMetrics(
        hotel.rooms,
        q.check_in,
        q.check_out,
        roomsCount,
      );
      const guestFitRoomMetrics = requiredGuests > 0
        ? roomMetrics.filter((x) => x.room.max_occupancy >= requiredGuests)
        : roomMetrics;
      const minNightlyPrice = guestFitRoomMetrics.length
        ? Math.min(...guestFitRoomMetrics.map((x) => x.nightlyPrice))
        : null;
      const minTotalPrice = guestFitRoomMetrics.length
        ? Math.min(...guestFitRoomMetrics.map((x) => x.totalPrice))
        : null;
      const availableCount = guestFitRoomMetrics.filter((x) => x.isAvailable).length;
      const nearbyCandidates = (hotel.nearby_points ?? []).filter((p) => {
        if (q.nearby_type && p.type !== q.nearby_type) return false;
        if (q.nearby_keyword && !p.name.toLowerCase().includes(q.nearby_keyword.toLowerCase())) return false;
        return true;
      });
      const nearestNearby = nearbyCandidates
        .filter((p) => typeof p.distance_km === 'number')
        .sort((a, b) => (a.distance_km ?? Number.MAX_SAFE_INTEGER) - (b.distance_km ?? Number.MAX_SAFE_INTEGER))[0] ?? null;

      return {
        ...hotel,
        min_nightly_price: minNightlyPrice,
        min_total_price: minTotalPrice,
        available_room_types: availableCount,
        guest_fit_room_types: guestFitRoomMetrics.length,
        nearby_match_count: nearbyCandidates.length,
        nearest_nearby_point: nearestNearby,
        nearest_nearby_distance_km: nearestNearby?.distance_km ?? null,
      };
    });

    const filtered = withComputed.filter((hotel) => {
      if (requiredGuests > 0 && (hotel.guest_fit_room_types ?? 0) <= 0) return false;
      const price = hotel.min_nightly_price ?? hotel.rooms[0]?.base_price ?? 0;
      if (q.min_price !== undefined && price < q.min_price) return false;
      if (q.max_price !== undefined && price > q.max_price) return false;
      return true;
    });

    const sorted = filtered.sort((a, b) => {
      const priceA = a.min_nightly_price ?? a.rooms[0]?.base_price ?? Number.MAX_SAFE_INTEGER;
      const priceB = b.min_nightly_price ?? b.rooms[0]?.base_price ?? Number.MAX_SAFE_INTEGER;
      const ratingA = a.review_summary?.rating ?? 0;
      const ratingB = b.review_summary?.rating ?? 0;
      const nearbyDistA = a.nearest_nearby_distance_km ?? Number.MAX_SAFE_INTEGER;
      const nearbyDistB = b.nearest_nearby_distance_km ?? Number.MAX_SAFE_INTEGER;

      if (q.nearby_sort === 'distance_asc') {
        if (nearbyDistA !== nearbyDistB) return nearbyDistA - nearbyDistB;
      }
      if (q.nearby_sort === 'distance_desc') {
        if (nearbyDistA !== nearbyDistB) return nearbyDistB - nearbyDistA;
      }

      switch (q.sort) {
        case 'price_asc':
          return priceA - priceB;
        case 'price_desc':
          return priceB - priceA;
        case 'rating_desc':
          return ratingB - ratingA;
        case 'star_desc':
          return b.star - a.star;
        case 'newest':
          return b.created_at.getTime() - a.created_at.getTime();
        case 'recommended':
        case 'smart':
        default:
          return (ratingB * 100 - priceB / 100) - (ratingA * 100 - priceA / 100);
      }
    });

    const total = sorted.length;
    const skip = (q.page - 1) * q.limit;
    const items = sorted.slice(skip, skip + q.limit);

    return {
      items,
      total,
      page: q.page,
      limit: q.limit,
      filters: {
        min_price: q.min_price,
        max_price: q.max_price,
        min_star: q.min_star,
        max_star: q.max_star,
        min_rating: q.min_rating,
        breakfast: !!q.breakfast,
        refundable: !!q.refundable,
        nearby_type: q.nearby_type,
        nearby_keyword: q.nearby_keyword,
        nearby_sort: q.nearby_sort ?? 'none',
        adults: q.adults,
        children: q.children,
        rooms_count: q.rooms_count,
      },
    };
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

  // 搜索建议（城市 + 酒店）
  async suggestions(q: HotelSuggestionDto) {
    const keyword = q.keyword?.trim();
    if (!keyword && !q.city) {
      return { items: [], total: 0 };
    }

    const where: any = {
      status: 'APPROVED',
      ...(q.city ? { city: q.city } : {}),
      ...(keyword
        ? {
            OR: [
              { city: { contains: keyword, mode: 'insensitive' } },
              { name_cn: { contains: keyword, mode: 'insensitive' } },
              { name_en: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const hotels = await this.prisma.hotels.findMany({
      where,
      take: 8,
      orderBy: { updated_at: 'desc' },
      include: { review_summary: true },
    });

    const items = hotels.map((h) => ({
      id: h.id,
      city: h.city,
      label: `${h.name_cn}${h.city ? ` · ${h.city}` : ''}`,
      rating: h.review_summary?.rating ?? null,
    }));

    return { items, total: items.length };
  }

  // 首页推荐酒店（可直接用于首屏卡片）
  async featured() {
    const items = await this.prisma.hotels.findMany({
      where: { status: 'APPROVED' },
      take: 12,
      orderBy: [{ updated_at: 'desc' }],
      include: {
        hotel_images: { orderBy: { sort: 'asc' } },
        review_summary: true,
        rooms: { orderBy: { base_price: 'asc' }, take: 1 },
      },
    });

    return items.map((h) => ({
      id: h.id,
      name_cn: h.name_cn,
      name_en: h.name_en,
      city: h.city,
      star: h.star,
      cover: h.hotel_images[0]?.url ?? null,
      rating: h.review_summary?.rating ?? null,
      review_count: h.review_summary?.review_count ?? 0,
      min_price: h.rooms[0]?.base_price ?? null,
    }));
  }

  // 首页 Banner（选取最新上架酒店生成广告卡）
  async banners() {
    const items = await this.prisma.hotels.findMany({
      where: { status: 'APPROVED' },
      take: 5,
      orderBy: [{ updated_at: 'desc' }],
      include: {
        hotel_images: { orderBy: { sort: 'asc' }, take: 1 },
        review_summary: true,
        rooms: { orderBy: { base_price: 'asc' }, take: 1 },
      },
    });

    return items.map((h) => ({
      id: h.id,
      title: h.name_cn,
      subtitle: `${h.city} · ${(h.review_summary?.rating ?? 0).toFixed(1)}分`,
      image: h.hotel_images[0]?.url ?? null,
      cta: '立即查看',
      min_price: h.rooms[0]?.base_price ?? null,
    }));
  }

  // 列表页筛选元信息
  async filterMetadata(city?: string) {
    const rooms = await this.prisma.rooms.findMany({
      where: {
        hotel: {
          status: 'APPROVED',
          ...(city ? { city } : {}),
        },
      },
      select: {
        base_price: true,
        breakfast: true,
        refundable: true,
        hotel: {
          select: {
            id: true,
            star: true,
          },
        },
      },
    });

    const tags = await this.prisma.hotel_tags.findMany({
      where: {
        hotel: {
          status: 'APPROVED',
          ...(city ? { city } : {}),
        },
      },
      select: { tag: true },
    });

    const summaries = await this.prisma.review_summary.findMany({
      where: {
        hotel: {
          status: 'APPROVED',
          ...(city ? { city } : {}),
        },
      },
      select: { rating: true },
    });

    const nearbyPoints = await this.prisma.nearby_points.findMany({
      where: {
        hotel: {
          status: 'APPROVED',
          ...(city ? { city } : {}),
        },
      },
      select: {
        type: true,
        name: true,
      },
    });

    const prices = rooms.map((r) => r.base_price);
    const stars = new Map<number, number>();
    const breakfastCount = rooms.filter((r) => r.breakfast).length;
    const refundableCount = rooms.filter((r) => r.refundable).length;

    for (const r of rooms) {
      stars.set(r.hotel.star, (stars.get(r.hotel.star) ?? 0) + 1);
    }

    const tagCounter = new Map<string, number>();
    for (const t of tags) {
      tagCounter.set(t.tag, (tagCounter.get(t.tag) ?? 0) + 1);
    }

    const nearbyCounter = new Map<string, number>();
    for (const p of nearbyPoints) {
      const key = `${p.type}::${p.name}`;
      nearbyCounter.set(key, (nearbyCounter.get(key) ?? 0) + 1);
    }
    const nearbyOptions = Array.from(nearbyCounter.entries())
      .map(([key, count]) => {
        const [type, name] = key.split('::');
        return { type, name, count };
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));

    const ratingBands = {
      '6_plus': summaries.filter((s) => s.rating >= 6).length,
      '7_plus': summaries.filter((s) => s.rating >= 7).length,
      '8_plus': summaries.filter((s) => s.rating >= 8).length,
      '9_plus': summaries.filter((s) => s.rating >= 9).length,
    };

    return {
      city: city ?? null,
      price_range: {
        min: prices.length ? Math.min(...prices) : 0,
        max: prices.length ? Math.max(...prices) : 0,
      },
      star_counts: Array.from(stars.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([star, count]) => ({ star, count })),
      room_feature_counts: {
        breakfast: breakfastCount,
        refundable: refundableCount,
      },
      rating_bands: ratingBands,
      popular_tags: Array.from(tagCounter.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([tag, count]) => ({ tag, count })),
      nearby_points: {
        metro: nearbyOptions.filter((x) => x.type === 'metro').slice(0, 20),
        attraction: nearbyOptions.filter((x) => x.type === 'attraction').slice(0, 20),
      },
    };
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

  // 某酒店在指定入住区间内的房型报价
  async offers(hotelId: string, q: StayRangeDto) {
    const hotel = await this.prisma.hotels.findFirst({
      where: { id: hotelId, status: 'APPROVED' },
      include: {
        rooms: {
          orderBy: { base_price: 'asc' },
          include: {
            price_calendar: q.check_in && q.check_out
              ? {
                  where: {
                    date: {
                      gte: this.startOfDay(q.check_in),
                      lt: this.startOfDay(q.check_out),
                    },
                  },
                  orderBy: { date: 'asc' },
                }
              : false,
            inventory_daily: q.check_in && q.check_out
              ? {
                  where: {
                    date: {
                      gte: this.startOfDay(q.check_in),
                      lt: this.startOfDay(q.check_out),
                    },
                  },
                  orderBy: { date: 'asc' },
                }
              : false,
          },
        },
      },
    });
    if (!hotel) throw new NotFoundException('Hotel not found');

    const roomsCount = q.rooms_count ?? 1;
    const today = this.startOfDay(new Date());
    const hasPastCheckIn = !!q.check_in && this.startOfDay(q.check_in) < today;
    const requiredGuests =
      q.adults !== undefined || q.children !== undefined
        ? (q.adults ?? 0) + (q.children ?? 0)
        : null;
    const metrics = this.computeRoomMetrics(hotel.rooms, q.check_in, q.check_out, roomsCount);

    return {
      hotel_id: hotel.id,
      check_in: q.check_in ?? null,
      check_out: q.check_out ?? null,
      rooms_count: roomsCount,
      adults: q.adults ?? null,
      children: q.children ?? null,
      items: metrics.map((m) => {
        const capacityFit =
          requiredGuests && requiredGuests > 0 ? m.room.max_occupancy >= requiredGuests : true;
        const isBookable = !hasPastCheckIn && capacityFit && m.isAvailable;
        const availabilityStatus = hasPastCheckIn
          ? 'PAST_DATE'
          : !capacityFit
          ? 'CAPACITY_MISMATCH'
          : m.isAvailable
            ? 'BOOKABLE'
            : 'SOLD_OUT';

        return {
          room_id: m.room.id,
          room_name: m.room.name,
          base_price: m.room.base_price,
          refundable: m.room.refundable,
          breakfast: m.room.breakfast,
          max_occupancy: m.room.max_occupancy,
          nightly_price: m.nightlyPrice,
          total_price: m.totalPrice,
          nights: m.nights,
          available_rooms: m.availableRooms,
          is_available: m.isAvailable,
          capacity_fit: capacityFit,
          is_bookable: isBookable,
          availability_status: availabilityStatus,
        };
      }),
    };
  }

  // 酒店月历价格（用于日期面板）
  async calendar(hotelId: string, q: HotelCalendarDto) {
    const hotel = await this.prisma.hotels.findFirst({
      where: { id: hotelId, status: 'APPROVED' },
      include: { rooms: { select: { id: true, base_price: true, total_rooms: true } } },
    });
    if (!hotel) throw new NotFoundException('Hotel not found');

    let monthStart: Date;
    if (q.month) {
      const [yearText, monthText] = String(q.month).split('-');
      const year = Number(yearText);
      const month = Number(monthText);
      monthStart = new Date(Date.UTC(year, Math.max(0, month - 1), 1, 0, 0, 0, 0));
    } else {
      const now = new Date();
      monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    }
    const nextMonthStart = new Date(monthStart);
    nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);

    const roomIds = hotel.rooms.map((r) => r.id);
    const fallbackMinBasePrice = hotel.rooms.length
      ? Math.min(...hotel.rooms.map((r) => r.base_price))
      : null;
    const [priceRows, invRows] = await Promise.all([
      this.prisma.price_calendar.findMany({
        where: {
          room_id: { in: roomIds },
          date: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      this.prisma.room_inventory_daily.findMany({
        where: {
          room_id: { in: roomIds },
          date: { gte: monthStart, lt: nextMonthStart },
        },
      }),
    ]);

    const pricesByDate = new Map<string, number[]>();
    for (const row of priceRows) {
      const key = row.date.toISOString().slice(0, 10);
      const arr = pricesByDate.get(key) ?? [];
      arr.push(row.price);
      pricesByDate.set(key, arr);
    }

    const invByDate = new Map<string, number[]>();
    for (const row of invRows) {
      const key = row.date.toISOString().slice(0, 10);
      const available = row.total_rooms - row.reserved_rooms - row.blocked_rooms;
      const arr = invByDate.get(key) ?? [];
      arr.push(available);
      invByDate.set(key, arr);
    }

    const days: Array<{ date: string; min_price: number | null; is_available: boolean }> = [];
    const cursor = new Date(monthStart);
    while (cursor < nextMonthStart) {
      const key = cursor.toISOString().slice(0, 10);
      const dayPrices = pricesByDate.get(key) ?? [];
      const dayInv = invByDate.get(key) ?? [];
      days.push({
        date: key,
        min_price: dayPrices.length ? Math.min(...dayPrices) : fallbackMinBasePrice,
        is_available: dayInv.length ? dayInv.some((x) => x > 0) : true,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return { hotel_id: hotelId, month: monthStart.toISOString().slice(0, 7), days };
  }

  // 酒店评分摘要（无独立点评表时由 summary 派生）
  async reviewsSummary(hotelId: string) {
    const hotel = await this.prisma.hotels.findFirst({
      where: { id: hotelId, status: 'APPROVED' },
      include: { review_summary: true },
    });
    if (!hotel) throw new NotFoundException('Hotel not found');

    const rating = hotel.review_summary?.rating ?? 0;
    const count = hotel.review_summary?.review_count ?? 0;

    const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));
    return {
      hotel_id: hotelId,
      rating,
      review_count: count,
      grade: this.ratingLabel(rating),
      dimensions: {
        cleanliness: Number(clamp(rating + 0.2, 0, 10).toFixed(1)),
        service: Number(clamp(rating - 0.3, 0, 10).toFixed(1)),
        facilities: Number(clamp(rating - 0.1, 0, 10).toFixed(1)),
        location: Number(clamp(rating + 0.4, 0, 10).toFixed(1)),
      },
      distribution: {
        '9_plus': Math.round(count * 0.25),
        '8_plus': Math.round(count * 0.3),
        '7_plus': Math.round(count * 0.3),
        '6_plus': Math.max(0, count - Math.round(count * 0.25) - Math.round(count * 0.3) - Math.round(count * 0.3)),
      },
      ai_summary: this.aiReviewSummary(hotel.city, rating),
    };
  }

  private computeRoomMetrics(
    rooms: Array<{
      id: string;
      name: string;
      base_price: number;
      total_rooms: number;
      max_occupancy: number;
      refundable: boolean;
      breakfast: boolean;
      price_calendar?: Array<{ date: Date; price: number }>;
      inventory_daily?: Array<{ date: Date; total_rooms: number; reserved_rooms: number; blocked_rooms: number }>;
    }>,
    checkInText?: string,
    checkOutText?: string,
    requiredRooms = 1,
  ) {
    const hasStay = !!checkInText && !!checkOutText;
    const checkIn = hasStay ? this.startOfDay(checkInText!) : null;
    const checkOut = hasStay ? this.startOfDay(checkOutText!) : null;
    const nights = checkIn && checkOut ? this.getStayDates(checkIn, checkOut) : [];

    return rooms.map((room) => {
      const priceMap = new Map((room.price_calendar ?? []).map((x) => [x.date.getTime(), x.price]));
      const invMap = new Map((room.inventory_daily ?? []).map((x) => [x.date.getTime(), x]));
      const nightly = nights.length
        ? Math.round(
            nights.reduce((sum, d) => sum + (priceMap.get(d.getTime()) ?? room.base_price), 0) / nights.length,
          )
        : room.base_price;
      const total = nights.length
        ? nights.reduce((sum, d) => sum + (priceMap.get(d.getTime()) ?? room.base_price), 0) * requiredRooms
        : room.base_price * requiredRooms;

      let minAvailable = room.total_rooms;
      if (nights.length) {
        minAvailable = Number.MAX_SAFE_INTEGER;
        for (const d of nights) {
          const inv = invMap.get(d.getTime());
          const available = (inv?.total_rooms ?? room.total_rooms) - (inv?.reserved_rooms ?? 0) - (inv?.blocked_rooms ?? 0);
          if (available < minAvailable) minAvailable = available;
        }
        if (!Number.isFinite(minAvailable)) minAvailable = room.total_rooms;
      }

      return {
        room,
        nights: nights.length || 1,
        nightlyPrice: nightly,
        totalPrice: total,
        availableRooms: minAvailable,
        isAvailable: minAvailable >= requiredRooms,
      };
    });
  }

  private ratingLabel(rating: number) {
    if (rating >= 9) return '非常好';
    if (rating >= 8) return '很好';
    if (rating >= 7) return '好';
    if (rating >= 6) return '愉快';
    return '一般';
  }

  private aiReviewSummary(city: string, rating: number) {
    const grade = this.ratingLabel(rating);
    return `酒店位于${city}区域，整体评价${grade}。住客普遍认可卫生、地理位置与性价比，适合休闲与短住。`;
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
