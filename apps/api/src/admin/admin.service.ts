/**
 * 文件说明：该文件定义了核心业务逻辑与数据库访问流程。
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { hotel_status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SetRoomInventoryDto } from './dto/set-room-inventory.dto';
import { InventoryRangeDto } from './dto/inventory-range.dto';
import { SetHotelStatusDto } from './dto/set-hotel-status.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private readonly hotelDetailInclude = {
    merchant: { select: { id: true, email: true, role: true } },
    hotel_images: { orderBy: { sort: 'asc' } },
    hotel_tags: true,
    nearby_points: true,
    rooms: {
      include: {
        inventory_daily: { orderBy: { date: 'asc' } },
      },
    },
    review_summary: true,
  } as const;

  // 查询全部酒店（跨商户）
  allHotels() {
    return this.prisma.hotels.findMany({
      where: { status: { not: hotel_status.DRAFT } },
      orderBy: { updated_at: 'desc' },
      include: this.hotelDetailInclude,
    });
  }

  // 查询单个酒店详情（按 hotel id）
  async hotelDetail(hotelId: string) {
    const hotel = await this.prisma.hotels.findFirst({
      where: { id: hotelId, status: { not: hotel_status.DRAFT } },
      include: this.hotelDetailInclude,
    });
    if (!hotel) throw new NotFoundException('Hotel not found');
    return hotel;
  }

  // 查询指定商户名下酒店（按 merchant id）
  async hotelsByMerchant(merchantId: string) {
    const merchant = await this.prisma.users.findUnique({
      where: { id: merchantId },
      select: { id: true, email: true, role: true },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const hotels = await this.prisma.hotels.findMany({
      where: { merchant_id: merchantId, status: { not: hotel_status.DRAFT } },
      orderBy: { updated_at: 'desc' },
      include: this.hotelDetailInclude,
    });

    return { merchant, hotels };
  }

  // 返回状态为 PENDING 的酒店，供后台审核
  pendingHotels() {
    return this.prisma.hotels.findMany({
      where: { status: 'PENDING' },
      orderBy: { updated_at: 'desc' },
      include: { merchant: { select: { id: true, email: true, role: true } } },
    });
  }

  // 将酒店状态改为 APPROVED
  async approve(hotelId: string) {
    const h = await this.prisma.hotels.findFirst({
      where: { id: hotelId, status: { not: hotel_status.DRAFT } },
      include: { rooms: true },
    });
    if (!h) throw new NotFoundException('Hotel not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.hotels.update({
        where: { id: hotelId },
        data: { status: 'APPROVED', reject_reason: null },
      });

      const dates = this.getFutureDates(90);
      for (const room of h.rooms) {
        await tx.room_inventory_daily.createMany({
          data: dates.map((date) => ({
            room_id: room.id,
            date,
            total_rooms: room.total_rooms,
            reserved_rooms: 0,
            blocked_rooms: 0,
          })),
          skipDuplicates: true,
        });
      }
      return updated;
    });
  }

  // 将酒店状态改为 REJECTED 并记录拒绝原因
  async reject(hotelId: string, reason: string) {
    const h = await this.prisma.hotels.findFirst({
      where: { id: hotelId, status: { not: hotel_status.DRAFT } },
    });
    if (!h) throw new NotFoundException('Hotel not found');

    return this.prisma.hotels.update({
      where: { id: hotelId },
      data: { status: 'REJECTED', reject_reason: reason },
    });
  }

  // 管理员设置酒店状态（仅允许 PENDING/APPROVED/REJECTED/OFFLINE）
  async setHotelStatus(hotelId: string, dto: SetHotelStatusDto) {
    const hotel = await this.prisma.hotels.findFirst({
      where: { id: hotelId, status: { not: hotel_status.DRAFT } },
      include: { rooms: true },
    });
    if (!hotel) throw new NotFoundException('Hotel not found');

    if (dto.status === hotel_status.DRAFT) {
      throw new BadRequestException('Admin cannot set hotel status to DRAFT');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.hotels.update({
        where: { id: hotelId },
        data: {
          status: dto.status,
          ...(dto.status === hotel_status.REJECTED
            ? { reject_reason: dto.reason ?? 'rejected' }
            : { reject_reason: null }),
        },
      });

      // 和审核通过保持一致：确保未来库存存在
      if (dto.status === hotel_status.APPROVED) {
        const dates = this.getFutureDates(90);
        for (const room of hotel.rooms) {
          await tx.room_inventory_daily.createMany({
            data: dates.map((date) => ({
              room_id: room.id,
              date,
              total_rooms: room.total_rooms,
              reserved_rooms: 0,
              blocked_rooms: 0,
            })),
            skipDuplicates: true,
          });
        }
      }

      return updated;
    });
  }

  // 查询房型库存日历
  async roomInventory(roomId: string, q: InventoryRangeDto) {
    const room = await this.prisma.rooms.findFirst({
      where: { id: roomId, hotel: { status: { not: hotel_status.DRAFT } } },
    });
    if (!room) throw new NotFoundException('Room not found');

    const where: any = { room_id: roomId };
    if (q.from || q.to) {
      where.date = {};
      if (q.from) where.date.gte = this.startOfDay(q.from);
      if (q.to) where.date.lte = this.startOfDay(q.to);
    }

    const items = await this.prisma.room_inventory_daily.findMany({
      where,
      orderBy: { date: 'asc' },
    });
    return items.map((x) => ({
      ...x,
      available_rooms: x.total_rooms - x.reserved_rooms - x.blocked_rooms,
    }));
  }

  // 设置房型单日库存
  async setRoomInventory(roomId: string, dto: SetRoomInventoryDto) {
    const room = await this.prisma.rooms.findFirst({
      where: { id: roomId, hotel: { status: { not: hotel_status.DRAFT } } },
    });
    if (!room) throw new NotFoundException('Room not found');
    const date = this.startOfDay(dto.date);

    return this.prisma.room_inventory_daily.upsert({
      where: { room_id_date: { room_id: roomId, date } },
      create: {
        room_id: roomId,
        date,
        total_rooms: dto.total_rooms ?? room.total_rooms,
        blocked_rooms: dto.blocked_rooms ?? 0,
      },
      update: {
        ...(dto.total_rooms !== undefined ? { total_rooms: dto.total_rooms } : {}),
        ...(dto.blocked_rooms !== undefined ? { blocked_rooms: dto.blocked_rooms } : {}),
      },
    });
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
