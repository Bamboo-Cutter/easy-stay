/**
 * 文件说明：该文件定义了核心业务逻辑与数据库访问流程。
 */
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertHotelDto } from './dto/upsert-hotel.dto';
import { SetImagesDto } from './dto/set-images.dto';
import { SetTagsDto } from './dto/set-tags.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpsertPriceDto } from './dto/upsert-price.dto';

@Injectable()
export class MerchantService {
  constructor(private prisma: PrismaService) {}

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

  // 创建酒店记录
  async createHotel(userId: string, dto: UpsertHotelDto) {
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
      },
    });
  }

  // 更新酒店信息并校验所有权
  async updateHotel(userId: string, hotelId: string, dto: UpsertHotelDto) {
    const hotel = await this.prisma.hotels.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (hotel.merchant_id !== userId) throw new ForbiddenException('Not your hotel');

    return this.prisma.hotels.update({
      where: { id: hotelId },
      data: {
        name_cn: dto.name_cn,
        name_en: dto.name_en,
        address: dto.address,
        city: dto.city,
        star: dto.star,
        type: dto.type,
        open_year: dto.open_year,
        ...(dto.status ? { status: dto.status } : {}),
      },
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
}
