/**
 * 文件说明：该文件定义了预订下单、查询与取消的业务逻辑。
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { booking_status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  // 创建预订并按入住日期区间扣减库存
  async create(dto: CreateBookingDto) {
    const checkIn = this.startOfDay(dto.check_in);
    const checkOut = this.startOfDay(dto.check_out);
    if (checkOut <= checkIn) {
      throw new BadRequestException('check_out must be later than check_in');
    }

    const dates = this.getStayDates(checkIn, checkOut);

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.rooms.findUnique({
        where: { id: dto.room_id },
        include: { hotel: true },
      });
      if (!room || room.hotel_id !== dto.hotel_id) {
        throw new NotFoundException('Room not found');
      }
      if (room.hotel.status !== 'APPROVED') {
        throw new BadRequestException('Hotel is not bookable');
      }

      const inventoryRows = await tx.room_inventory_daily.findMany({
        where: { room_id: room.id, date: { in: dates } },
      });
      const inventoryMap = new Map(inventoryRows.map((x) => [x.date.getTime(), x]));

      for (const date of dates) {
        const row = inventoryMap.get(date.getTime());
        const total = row?.total_rooms ?? room.total_rooms;
        const reserved = row?.reserved_rooms ?? 0;
        const blocked = row?.blocked_rooms ?? 0;
        const available = total - reserved - blocked;
        if (available < dto.rooms_count) {
          throw new BadRequestException(`Insufficient inventory on ${date.toISOString().slice(0, 10)}`);
        }
      }

      const missingDates = dates.filter((d) => !inventoryMap.has(d.getTime()));
      if (missingDates.length > 0) {
        await tx.room_inventory_daily.createMany({
          data: missingDates.map((d) => ({
            room_id: room.id,
            date: d,
            total_rooms: room.total_rooms,
            reserved_rooms: 0,
            blocked_rooms: 0,
          })),
          skipDuplicates: true,
        });
      }

      for (const date of dates) {
        await tx.room_inventory_daily.update({
          where: { room_id_date: { room_id: room.id, date } },
          data: { reserved_rooms: { increment: dto.rooms_count } },
        });
      }

      const priceRows = await tx.price_calendar.findMany({
        where: { room_id: room.id, date: { in: dates } },
      });
      const priceMap = new Map(priceRows.map((x) => [x.date.getTime(), x.price]));
      const nightlySum = dates.reduce((sum, d) => sum + (priceMap.get(d.getTime()) ?? room.base_price), 0);
      const totalAmount = nightlySum * dto.rooms_count;

      return tx.bookings.create({
        data: {
          user_id: dto.user_id,
          hotel_id: dto.hotel_id,
          room_id: dto.room_id,
          check_in: checkIn,
          check_out: checkOut,
          rooms_count: dto.rooms_count,
          guest_count: dto.guest_count,
          total_amount: totalAmount,
          status: booking_status.CONFIRMED,
          contact_name: dto.contact_name,
          contact_phone: dto.contact_phone,
        },
      });
    });
  }

  // 查询单个预订详情
  async detail(id: string) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id },
      include: {
        hotel: { select: { id: true, name_cn: true, name_en: true, city: true, address: true } },
        room: { select: { id: true, name: true, max_occupancy: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  // 取消预订并释放库存
  async cancel(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.bookings.findUnique({ where: { id } });
      if (!booking) throw new NotFoundException('Booking not found');
      if (booking.status === booking_status.CANCELLED) return booking;

      const dates = this.getStayDates(booking.check_in, booking.check_out);
      for (const date of dates) {
        const row = await tx.room_inventory_daily.findUnique({
          where: { room_id_date: { room_id: booking.room_id, date } },
        });
        if (!row) continue;
        await tx.room_inventory_daily.update({
          where: { room_id_date: { room_id: booking.room_id, date } },
          data: { reserved_rooms: Math.max(0, row.reserved_rooms - booking.rooms_count) },
        });
      }

      return tx.bookings.update({
        where: { id: booking.id },
        data: { status: booking_status.CANCELLED },
      });
    });
  }

  private startOfDay(value: string | Date) {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // check_out 为离店日，不计入入住夜晚
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
