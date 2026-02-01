import { PrismaClient, user_role, hotel_status } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1) 账号（一个 admin 一个 merchant）
  const adminPwd = await bcrypt.hash('Admin12345!', 10);
  const merchantPwd = await bcrypt.hash('Merchant12345!', 10);

  const admin = await prisma.users.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      password: adminPwd,
      role: user_role.ADMIN,
    },
  });

  const merchant = await prisma.users.upsert({
    where: { email: 'merchant@demo.com' },
    update: {},
    create: {
      email: 'merchant@demo.com',
      password: merchantPwd,
      role: user_role.MERCHANT,
    },
  });

  // 2) 酒店
  const h1 = await prisma.hotels.create({
    data: {
      name_cn: '星河酒店（演示）',
      name_en: 'Starglow Hotel (Demo)',
      address: '1 Demo Street',
      city: 'Sydney',
      star: 5,
      type: 'Resort',
      open_year: 2018,
      status: hotel_status.APPROVED,
      merchant_id: merchant.id,
      hotel_images: {
        create: [
          { url: 'https://picsum.photos/seed/h1-1/800/600', sort: 1 },
          { url: 'https://picsum.photos/seed/h1-2/800/600', sort: 2 },
        ],
      },
      hotel_tags: {
        create: [{ tag: '海景' }, { tag: '含早餐' }, { tag: '亲子' }],
      },
      nearby_points: {
        create: [
          { type: 'attraction', name: 'Opera House', distance_km: 2.3 },
          { type: 'metro', name: 'Town Hall Station', distance_km: 1.1 },
        ],
      },
      review_summary: {
        create: { rating: 4.6, review_count: 128 },
      },
    },
  });

  const h2 = await prisma.hotels.create({
    data: {
      name_cn: '城市便捷酒店（演示）',
      name_en: 'City Easy Stay (Demo)',
      address: '99 Example Ave',
      city: 'Sydney',
      star: 3,
      type: 'Business',
      open_year: 2012,
      status: hotel_status.PENDING,
      merchant_id: merchant.id,
      hotel_tags: { create: [{ tag: '性价比' }, { tag: '近地铁' }] },
    },
  });

  // 3) 房型 + 价格日历
  const room1 = await prisma.rooms.create({
    data: {
      hotel_id: h1.id,
      name: '豪华大床房',
      capacity: 2,
      base_price: 22000, // 用“分”避免浮点：$220.00 -> 22000
      refundable: true,
      breakfast: true,
    },
  });

  // 随便造 7 天价格
  const today = new Date();
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  await prisma.price_calendar.createMany({
    data: days.map((d, i) => ({
      room_id: room1.id,
      date: d,
      price: 20000 + i * 1000,
      promo_type: i % 3 === 0 ? 'discount' : null,
      promo_value: i % 3 === 0 ? 10 : null,
    })),
    skipDuplicates: true,
  });

  console.log('✅ Seed done');
  console.log('Demo accounts:');
  console.log('ADMIN    admin@demo.com / Admin12345!');
  console.log('MERCHANT merchant@demo.com / Merchant12345!');
  console.log('Hotels:', h1.id, h2.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
