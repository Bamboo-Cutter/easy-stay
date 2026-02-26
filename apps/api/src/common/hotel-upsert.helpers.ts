import { UpsertHotelDto } from '../merchant/dto/upsert-hotel.dto';

// 这里故意用最小约束类型，避免把 Prisma 复杂事务类型传播到每个 service。
// helper 的目标是“收敛重复写入逻辑”，不是重新定义一套 ORM 类型系统。
type HotelWriteTx = any;

// 把可选字段 DTO 转成 Prisma update data，只带用户实际传入的字段。
export function buildHotelUpdateData(dto: UpsertHotelDto) {
  const hotelUpdateData: Record<string, unknown> = {};
  if (dto.name_cn !== undefined) hotelUpdateData.name_cn = dto.name_cn;
  if (dto.name_en !== undefined) hotelUpdateData.name_en = dto.name_en;
  if (dto.address !== undefined) hotelUpdateData.address = dto.address;
  if (dto.city !== undefined) hotelUpdateData.city = dto.city;
  if (dto.star !== undefined) hotelUpdateData.star = dto.star;
  if (dto.type !== undefined) hotelUpdateData.type = dto.type;
  if (dto.open_year !== undefined) hotelUpdateData.open_year = new Date(dto.open_year);
  if (dto.status !== undefined) hotelUpdateData.status = dto.status;
  return hotelUpdateData;
}

// 统一处理酒店更新时的关联子表替换逻辑（图片/标签/周边/房型+日历）。
// 约定行为：
// - dto.xxx === undefined: 不改该子表
// - dto.xxx === []: 清空该子表
export async function applyHotelUpsertRelations(
  tx: HotelWriteTx,
  hotelId: string,
  dto: UpsertHotelDto,
  dates: Date[],
) {
  if (dto.images !== undefined) {
    await tx.hotel_images.deleteMany({ where: { hotel_id: hotelId } });
    if (dto.images.length > 0) {
      await tx.hotel_images.createMany({
        data: dto.images.map((x: any, index: number) => ({
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
        data: dto.nearby_points.map((x: any) => ({
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
    const oldRoomIds = oldRooms.map((x: { id: string }) => x.id);

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
}

