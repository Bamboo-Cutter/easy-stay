import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async findByHotelId(hotelId: string) {
    return this.prisma.rooms.findMany({
      where: {
        hotel_id: hotelId, // string → string，完全匹配
      },
      orderBy: {
        id: 'asc',
      },
    })
  }
}
