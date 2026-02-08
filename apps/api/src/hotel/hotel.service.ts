import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HotelService {
  constructor(private prisma: PrismaService) {}

  // 根据 merchant_id 查询酒店，如果没传就返回全部
  async findAll(merchant_id?: string) {
    const where = merchant_id ? { merchant_id } : {};
    return await this.prisma.hotels.findMany({
      where,
      select: {
        id: true,
        name_cn: true,
        name_en: true,
        address: true,
        city: true,
        star: true,
        type: true,
        merchant_id:true,
        open_year: true,
        status: true,
        reject_reason: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async findOne(id: string) {
    return await this.prisma.hotels.findUnique({
      where: { id },
      include: {
        rooms: true,  // 🔥 加上这行，rooms 数据就会一起返回
        hotel_images: true,
        hotel_tags: true,
        nearby_points: true,
        review_summary: true,
      },
    });
  }
}
