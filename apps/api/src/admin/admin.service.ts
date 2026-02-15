/**
 * 文件说明：该文件定义了核心业务逻辑与数据库访问流程。
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { hotel_status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SetRoomInventoryDto } from './dto/set-room-inventory.dto';
import { InventoryRangeDto } from './dto/inventory-range.dto';
import { SetHotelStatusDto } from './dto/set-hotel-status.dto';
import { CreateHotelFullDto } from '../merchant/dto/create-hotel-full.dto';
import { UpsertHotelDto } from '../merchant/dto/upsert-hotel.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}
  private readonly defaultCalendarDays = 90;

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

  // 管理员创建酒店（默认创建房型的价格日历和库存日历）
  async createHotel(adminId: string, dto: CreateHotelFullDto) {
    this.assertAdminHotelStatus(dto.status);
    const tags = [...new Set(dto.tags ?? [])];
    const dates = this.getFutureDates(this.defaultCalendarDays);

    return this.prisma.hotels.create({
      data: {
        merchant_id: adminId,
        name_cn: dto.name_cn,
        name_en: dto.name_en,
        address: dto.address,
        city: dto.city,
        star: dto.star,
        type: dto.type,
        open_year: dto.open_year,
        status: dto.status ?? hotel_status.PENDING,
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
      include: this.hotelDetailInclude,
    });
  }

  // 管理员更新酒店（可改酒店基础资料/图片/标签/房型/周边点，不直接改价格日历和库存日历）
  async updateHotel(hotelId: string, dto: UpsertHotelDto) {
    const hotel = await this.prisma.hotels.findFirst({
      where: { id: hotelId, status: { not: hotel_status.DRAFT } },
    });
    if (!hotel) throw new NotFoundException('Hotel not found');
    this.assertAdminHotelStatus(dto.status);
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
        include: this.hotelDetailInclude,
      });
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

  private assertAdminHotelStatus(status?: hotel_status) {
    if (!status) return;
    if (status === hotel_status.DRAFT) {
      throw new BadRequestException('Admin cannot set hotel status to DRAFT');
    }
  }
}
