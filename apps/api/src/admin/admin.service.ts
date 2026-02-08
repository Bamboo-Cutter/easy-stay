import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  pendingHotels() {
    return this.prisma.hotels.findMany({
      where: { status: 'PENDING' },
      orderBy: { updated_at: 'desc' },
      include: { merchant: { select: { id: true, email: true, role: true } } },
    });
  }

  async approve(hotelId: string) {
    const h = await this.prisma.hotels.findUnique({ where: { id: hotelId } });
    if (!h) throw new NotFoundException('Hotel not found');

    return this.prisma.hotels.update({
      where: { id: hotelId },
      data: { status: 'APPROVED', reject_reason: null },
    });
  }

  async reject(hotelId: string, reason: string) {
    const h = await this.prisma.hotels.findUnique({ where: { id: hotelId } });
    if (!h) throw new NotFoundException('Hotel not found');

    return this.prisma.hotels.update({
      where: { id: hotelId },
      data: { status: 'REJECTED', reject_reason: reason },
    });
  }
}
