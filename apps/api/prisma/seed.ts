import { PrismaClient, user_role, hotel_status, booking_status } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 0) 清理业务数据，保证每次 seed 后数据规模稳定
  await prisma.bookings.deleteMany();
  await prisma.room_inventory_daily.deleteMany();
  await prisma.price_calendar.deleteMany();
  await prisma.rooms.deleteMany();
  await prisma.hotel_images.deleteMany();
  await prisma.hotel_tags.deleteMany();
  await prisma.nearby_points.deleteMany();
  await prisma.review_summary.deleteMany();
  await prisma.hotels.deleteMany();
  await prisma.users.deleteMany();

  // 1) 账号（1 个管理员 + 3 个商户 + 1 个普通预订用户）
  const adminPwd = await bcrypt.hash('Admin12345!', 10);
  const merchantPwd = await bcrypt.hash('Merchant12345!', 10);
  const userPwd = await bcrypt.hash('User12345!', 10);

  const admin = await prisma.users.create({
    data: {
      email: 'admin@demo.com',
      password: adminPwd,
      role: user_role.ADMIN,
    },
  });

  const merchants = await Promise.all(
    ['merchant1@demo.com', 'merchant2@demo.com', 'merchant3@demo.com'].map((email) =>
      prisma.users.create({
        data: {
          email,
          password: merchantPwd,
          role: user_role.MERCHANT,
        },
      }),
    ),
  );

  const user = await prisma.users.create({
    data: {
      email: 'user@demo.com',
      password: userPwd,
      role: user_role.MERCHANT,
    },
  });

  const cities = ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra'];
  const types = ['Business', 'Resort', 'Boutique', 'Apartment', 'Airport'];
  const tagsPool = ['海景', '近地铁', '亲子', '免费停车', '含早餐', '高评分', '商务', '市中心'];
  const roomTypes = ['标准大床房', '豪华双床房', '家庭套房', '行政套房'];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const calendarDays = Array.from({ length: 45 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  // 2) 批量生成酒店（120 家）
  const hotels: Array<{ id: string; status: hotel_status }> = [];
  for (let i = 1; i <= 120; i += 1) {
    let status: hotel_status = hotel_status.APPROVED;
    if (i % 10 === 0) status = hotel_status.OFFLINE;
    else if (i % 6 === 0) status = hotel_status.PENDING;
    else if (i % 15 === 0) status = hotel_status.REJECTED;
    else if (i % 22 === 0) status = hotel_status.DRAFT;

    const merchant = merchants[i % merchants.length];
    const city = cities[i % cities.length];
    const type = types[i % types.length];
    const star = (i % 5) + 1;
    const openYear = 2008 + (i % 17);
    const openDate = new Date(openYear, i % 12, ((i % 27) + 1));

    const created = await prisma.hotels.create({
      data: {
        name_cn: `易宿演示酒店-${i.toString().padStart(3, '0')}`,
        name_en: `EasyStay Demo Hotel ${i.toString().padStart(3, '0')}`,
        address: `${100 + i} Demo Street`,
        city,
        star,
        type,
        open_year: openDate,
        status,
        reject_reason: status === hotel_status.REJECTED ? '资料不完整（演示）' : null,
        merchant_id: merchant.id,
        hotel_images: {
          create: [
            { url: `https://picsum.photos/seed/h${i}-1/1200/800`, sort: 0 },
            { url: `https://picsum.photos/seed/h${i}-2/1200/800`, sort: 1 },
          ],
        },
        hotel_tags: {
          create: [
            { tag: tagsPool[i % tagsPool.length] },
            { tag: tagsPool[(i + 3) % tagsPool.length] },
          ],
        },
        nearby_points: {
          create: [
            { type: 'attraction', name: `Attraction ${i}`, distance_km: Number((0.6 + (i % 8) * 0.4).toFixed(1)) },
            { type: 'metro', name: `Metro ${i}`, distance_km: Number((0.2 + (i % 5) * 0.3).toFixed(1)) },
          ],
        },
        review_summary: {
          create: {
            rating: Number((3.5 + ((i % 16) * 0.1)).toFixed(1)),
            review_count: 20 + (i % 400),
          },
        },
      },
    });
    hotels.push({ id: created.id, status: created.status });
  }

  // 3) 批量生成房型 + 价格 + 库存
  const roomIds: string[] = [];
  for (let i = 0; i < hotels.length; i += 1) {
    const hotel = hotels[i];
    const roomCount = 2 + (i % 3); // 2-4 个房型

    for (let r = 0; r < roomCount; r += 1) {
      const basePrice = 14000 + ((i * 37 + r * 19) % 22000); // 140-360 澳元区间（分）
      const totalRooms = 8 + ((i + r) % 18);

      const room = await prisma.rooms.create({
        data: {
          hotel_id: hotel.id,
          name: `${roomTypes[r % roomTypes.length]}-${r + 1}`,
          max_occupancy: r % 4 === 3 ? 4 : 2 + (r % 2),
          total_rooms: totalRooms,
          base_price: basePrice,
          refundable: r % 2 === 0,
          breakfast: r % 3 !== 0,
        },
      });
      roomIds.push(room.id);

      await prisma.price_calendar.createMany({
        data: calendarDays.map((d, idx) => ({
          room_id: room.id,
          date: d,
          price: basePrice + (idx % 8) * 300 + (i % 5) * 120,
          promo_type: idx % 7 === 0 ? 'DISCOUNT' : null,
          promo_value: idx % 7 === 0 ? 10 : null,
        })),
        skipDuplicates: true,
      });

      const baseBlocked = (i + r) % 7 === 0 ? 1 : 0;
      await prisma.room_inventory_daily.createMany({
        data: calendarDays.map((d, idx) => ({
          room_id: room.id,
          date: d,
          total_rooms: totalRooms,
          blocked_rooms: idx % 11 === 0 ? baseBlocked + 1 : baseBlocked,
          reserved_rooms: 0,
        })),
        skipDuplicates: true,
      });
    }
  }

  // 4) 生成演示订单（约 80 条），仅在已上架酒店上创建
  const approvedHotels = hotels.filter((h) => h.status === hotel_status.APPROVED);
  const approvedHotelSet = new Set(approvedHotels.map((h) => h.id));
  const approvedRooms = await prisma.rooms.findMany({
    where: { hotel_id: { in: Array.from(approvedHotelSet) } },
    select: { id: true, hotel_id: true, base_price: true },
    take: 200,
  });

  const bookingsToCreate = approvedRooms.slice(0, 80);
  for (let i = 0; i < bookingsToCreate.length; i += 1) {
    const room = bookingsToCreate[i];
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + (i % 20) + 1);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + 1 + (i % 3));
    const roomsCount = 1 + (i % 2);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24)));

    await prisma.bookings.create({
      data: {
        user_id: user.id,
        hotel_id: room.hotel_id,
        room_id: room.id,
        check_in: checkIn,
        check_out: checkOut,
        rooms_count: roomsCount,
        guest_count: 2 + (i % 2),
        total_amount: room.base_price * nights * roomsCount,
        status: i % 9 === 0 ? booking_status.CANCELLED : booking_status.CONFIRMED,
        contact_name: `Demo User ${i + 1}`,
        contact_phone: `1880000${(1000 + i).toString().slice(-4)}`,
      },
    });
  }

  const hotelCount = await prisma.hotels.count();
  const roomCount = await prisma.rooms.count();
  const bookingCount = await prisma.bookings.count();

  console.log('✅ Seed done');
  console.log('Demo accounts:');
  console.log('ADMIN    admin@demo.com / Admin12345!');
  console.log('MERCHANT merchant1@demo.com / Merchant12345!');
  console.log('MERCHANT merchant2@demo.com / Merchant12345!');
  console.log('MERCHANT merchant3@demo.com / Merchant12345!');
  console.log('USER     user@demo.com / User12345!');
  console.log(`Generated hotels=${hotelCount}, rooms=${roomCount}, bookings=${bookingCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
