/**
 * 文件说明：该文件定义了核心业务逻辑与数据库访问流程。
 */
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { hotel_status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertHotelDto } from './dto/upsert-hotel.dto';
import { CreateHotelFullDto } from './dto/create-hotel-full.dto';
import { SetImagesDto } from './dto/set-images.dto';
import { SetTagsDto } from './dto/set-tags.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpsertPriceDto } from './dto/upsert-price.dto';

@Injectable()
export class MerchantService {
  constructor(private prisma: PrismaService) {}
  private readonly defaultCalendarDays = 90;
  private readonly merchantAllowedStatuses = new Set<hotel_status>([
    hotel_status.DRAFT,
    hotel_status.PENDING,
    hotel_status.OFFLINE,
  ]);

  // 查询当前登录商家的基础资料
  async me(userId: string) {
    const u = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, created_at: true },
    });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  // 查询当前商家名下所有酒店（含图片/标签/房型）
  async myHotels(userId: string) {
    return this.prisma.hotels.findMany({
      where: { merchant_id: userId },
      orderBy: { updated_at: 'desc' },
      include: {
        hotel_images: { orderBy: { sort: 'asc' } },
        hotel_tags: true,
        rooms: true,
        review_summary: true,
      },
    });
  }

  // 查询当前商家名下单个酒店详情并校验所有权
  async myHotelDetail(userId: string, hotelId: string) {
    const hotel = await this.prisma.hotels.findUnique({
      where: { id: hotelId },
      include: {
        hotel_images: { orderBy: { sort: 'asc' } },
        hotel_tags: true,
        nearby_points: true,
        review_summary: true,
        rooms: {
          orderBy: { name: 'asc' },
          include: {
            price_calendar: { orderBy: { date: 'asc' } },
            inventory_daily: { orderBy: { date: 'asc' } },
          },
        },
      },
    });

    if (!hotel) throw new NotFoundException('Hotel not found');
    if (hotel.merchant_id !== userId) throw new ForbiddenException('Not your hotel');
    return hotel;
  }

  // 创建酒店记录（支持关联子表一体化写入）
  async createHotel(userId: string, dto: CreateHotelFullDto) {
    this.assertMerchantStatus(dto.status);
    const tags = [...new Set(dto.tags ?? [])];
    const dates = this.getFutureDates(this.defaultCalendarDays);
    return this.prisma.hotels.create({
      data: {
        merchant_id: userId,
        name_cn: dto.name_cn,
        name_en: dto.name_en,
        address: dto.address,
        city: dto.city,
        star: dto.star,
        type: dto.type,
        open_year: dto.open_year,
        status: dto.status ?? 'DRAFT',
        ...(dto.images?.length
          ? {
              hotel_images: {
                create: dto.images.map((x, index) => ({
                  url: x.url,
                  sort: x.sort ?? index,
                })),
              },
            }
          : {}),
        ...(tags.length
          ? {
              hotel_tags: {
                create: tags.map((tag) => ({ tag })),
              },
            }
          : {}),
        ...(dto.rooms?.length
          ? {
              rooms: {
                create: dto.rooms.map((room) => ({
                  name: room.name,
                  max_occupancy: room.max_occupancy,
                  total_rooms: room.total_rooms,
                  base_price: room.base_price,
                  refundable: room.refundable,
                  breakfast: room.breakfast,
                  price_calendar: {
                    create: dates.map((date) => ({
                      date,
                      price: room.base_price,
                    })),
                  },
                  inventory_daily: {
                    create: dates.map((date) => ({
                      date,
                      total_rooms: room.total_rooms,
                      blocked_rooms: 0,
                      reserved_rooms: 0,
                    })),
                  },
                })),
              },
            }
          : {}),
        ...(dto.nearby_points?.length
          ? {
              nearby_points: {
                create: dto.nearby_points.map((x) => ({
                  type: x.type,
                  name: x.name,
                  distance_km: x.distance_km,
                })),
              },
            }
          : {}),
      },
      include: {
        hotel_images: { orderBy: { sort: 'asc' } },
        hotel_tags: true,
        rooms: {
          include: {
            price_calendar: { orderBy: { date: 'asc' } },
            inventory_daily: { orderBy: { date: 'asc' } },
          },
        },
        nearby_points: true,
      },
    });
  }

  // 更新酒店信息并校验所有权
  async updateHotel(userId: string, hotelId: string, dto: UpsertHotelDto) {
    const hotel = await this.prisma.hotels.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (hotel.merchant_id !== userId) throw new ForbiddenException('Not your hotel');
    this.assertMerchantStatus(dto.status);
    const dates = this.getFutureDates(this.defaultCalendarDays);

    return this.prisma.$transaction(async (tx) => {
      const hotelUpdateData: any = {};
      if (dto.name_cn !== undefined) hotelUpdateData.name_cn = dto.name_cn;
      if (dto.name_en !== undefined) hotelUpdateData.name_en = dto.name_en;
      if (dto.address !== undefined) hotelUpdateData.address = dto.address;
      if (dto.city !== undefined) hotelUpdateData.city = dto.city;
      if (dto.star !== undefined) hotelUpdateData.star = dto.star;
      if (dto.type !== undefined) hotelUpdateData.type = dto.type;
      if (dto.open_year !== undefined) hotelUpdateData.open_year = dto.open_year;
      if (dto.status !== undefined) hotelUpdateData.status = dto.status;

      if (Object.keys(hotelUpdateData).length > 0) {
        await tx.hotels.update({
          where: { id: hotelId },
          data: hotelUpdateData,
        });
      }

      if (dto.images !== undefined) {
        await tx.hotel_images.deleteMany({ where: { hotel_id: hotelId } });
        if (dto.images.length > 0) {
          await tx.hotel_images.createMany({
            data: dto.images.map((x, index) => ({
              hotel_id: hotelId,
              url: x.url,
              sort: x.sort ?? index,
            })),
          });
        }
      }

      if (dto.tags !== undefined) {
        const tags = [...new Set(dto.tags)];
        await tx.hotel_tags.deleteMany({ where: { hotel_id: hotelId } });
        if (tags.length > 0) {
          await tx.hotel_tags.createMany({
            data: tags.map((tag) => ({ hotel_id: hotelId, tag })),
            skipDuplicates: true,
          });
        }
      }

      if (dto.nearby_points !== undefined) {
        await tx.nearby_points.deleteMany({ where: { hotel_id: hotelId } });
        if (dto.nearby_points.length > 0) {
          await tx.nearby_points.createMany({
            data: dto.nearby_points.map((x) => ({
              hotel_id: hotelId,
              type: x.type,
              name: x.name,
              distance_km: x.distance_km,
            })),
          });
        }
      }

      if (dto.rooms !== undefined) {
        const oldRooms = await tx.rooms.findMany({
          where: { hotel_id: hotelId },
          select: { id: true },
        });
        const oldRoomIds = oldRooms.map((x) => x.id);

        if (oldRoomIds.length > 0) {
          await tx.price_calendar.deleteMany({ where: { room_id: { in: oldRoomIds } } });
          await tx.room_inventory_daily.deleteMany({ where: { room_id: { in: oldRoomIds } } });
          await tx.rooms.deleteMany({ where: { id: { in: oldRoomIds } } });
        }

        for (const room of dto.rooms) {
          await tx.rooms.create({
            data: {
              hotel_id: hotelId,
              name: room.name,
              max_occupancy: room.max_occupancy,
              total_rooms: room.total_rooms,
              base_price: room.base_price,
              refundable: room.refundable,
              breakfast: room.breakfast,
              price_calendar: {
                create: dates.map((date) => ({
                  date,
                  price: room.base_price,
                })),
              },
              inventory_daily: {
                create: dates.map((date) => ({
                  date,
                  total_rooms: room.total_rooms,
                  blocked_rooms: 0,
                  reserved_rooms: 0,
                })),
              },
            },
          });
        }
      }

      return tx.hotels.findUnique({
        where: { id: hotelId },
        include: {
          hotel_images: { orderBy: { sort: 'asc' } },
          hotel_tags: true,
          nearby_points: true,
          review_summary: true,
          rooms: {
            orderBy: { name: 'asc' },
            include: {
              price_calendar: { orderBy: { date: 'asc' } },
              inventory_daily: { orderBy: { date: 'asc' } },
            },
          },
        },
      });
    });
  }

  // 覆盖写入酒店图片（先删后插）
  async setImages(userId: string, hotelId: string, dto: SetImagesDto) {
    const hotel = await this.prisma.hotels.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (hotel.merchant_id !== userId) throw new ForbiddenException('Not your hotel');

    await this.prisma.hotel_images.deleteMany({ where: { hotel_id: hotelId } });

    await this.prisma.hotel_images.createMany({
      data: dto.items.map((x) => ({
        hotel_id: hotelId,
        url: x.url,
        sort: x.sort,
      })),
    });

    return { status: 'ok' };
  }

  // 覆盖写入酒店标签（先删后插）
  async setTags(userId: string, hotelId: string, dto: SetTagsDto) {
    const hotel = await this.prisma.hotels.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (hotel.merchant_id !== userId) throw new ForbiddenException('Not your hotel');

    await this.prisma.hotel_tags.deleteMany({ where: { hotel_id: hotelId } });

    await this.prisma.hotel_tags.createMany({
      data: dto.tags.map((tag) => ({ hotel_id: hotelId, tag })),
      skipDuplicates: true,
    });

    return { status: 'ok' };
  }

  // 为酒店新增房型
  async createRoom(userId: string, hotelId: string, dto: CreateRoomDto) {
    const hotel = await this.prisma.hotels.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (hotel.merchant_id !== userId) throw new ForbiddenException('Not your hotel');

    return this.prisma.rooms.create({
      data: {
        hotel_id: hotelId,
        name: dto.name,
        max_occupancy: dto.max_occupancy,
        total_rooms: dto.total_rooms,
        base_price: dto.base_price,
        refundable: dto.refundable,
        breakfast: dto.breakfast,
      },
    });
  }

  // 按 room + date 执行价格日历 upsert
  async upsertRoomPrice(userId: string, roomId: string, dto: UpsertPriceDto) {
    const room = await this.prisma.rooms.findUnique({
      where: { id: roomId },
      include: { hotel: true },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hotel.merchant_id !== userId) throw new ForbiddenException('Not your room');

    return this.prisma.price_calendar.upsert({
      where: { room_id_date: { room_id: roomId, date: new Date(dto.date) } },
      create: {
        room_id: roomId,
        date: new Date(dto.date),
        price: dto.price,
        promo_type: dto.promo_type,
        promo_value: dto.promo_value,
      },
      update: {
        price: dto.price,
        promo_type: dto.promo_type,
        promo_value: dto.promo_value,
      },
    });
  }

  private assertMerchantStatus(status?: hotel_status) {
    if (!status) return;
    if (!this.merchantAllowedStatuses.has(status)) {
      throw new BadRequestException('Merchant can only set status to DRAFT, PENDING, or OFFLINE');
    }
  }

  private startOfDay(value: string | Date) {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getFutureDates(days: number) {
    const list: Date[] = [];
    const today = this.startOfDay(new Date());
    for (let i = 0; i < days; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push(d);
    }
    return list;
  }
}
