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

  async me(userId: string) {
    const u = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, created_at: true },
    });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

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

  async setImages(userId: string, hotelId: string, dto: SetImagesDto) {
    const hotel = await this.prisma.hotels.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (hotel.merchant_id !== userId) throw new ForbiddenException('Not your hotel');

    // 简单做法：先删后插（你也可以做更精细的 diff）
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

  async setTags(userId: string, hotelId: string, dto: SetTagsDto) {
    const hotel = await this.prisma.hotels.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (hotel.merchant_id !== userId) throw new ForbiddenException('Not your hotel');

    await this.prisma.hotel_tags.deleteMany({ where: { hotel_id: hotelId } });

    // hotel_tags 有 @@unique([hotel_id, tag])，createMany 也 OK
    await this.prisma.hotel_tags.createMany({
      data: dto.tags.map((tag) => ({ hotel_id: hotelId, tag })),
      skipDuplicates: true,
    });

    return { status: 'ok' };
  }

  async createRoom(userId: string, hotelId: string, dto: CreateRoomDto) {
    const hotel = await this.prisma.hotels.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (hotel.merchant_id !== userId) throw new ForbiddenException('Not your hotel');

    return this.prisma.rooms.create({
      data: {
        hotel_id: hotelId,
        name: dto.name,
        capacity: dto.capacity,
        base_price: dto.base_price,
        refundable: dto.refundable,
        breakfast: dto.breakfast,
      },
    });
  }

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
