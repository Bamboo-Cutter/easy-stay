import { PrismaClient, user_role, hotel_status, booking_status } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hotelTarget = Number(process.env.SEED_HOTEL_COUNT ?? 5000);
  const calendarDayCount = Number(process.env.SEED_CALENDAR_DAYS ?? 45);
  const bookingTarget = Number(process.env.SEED_BOOKING_COUNT ?? 80);

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
      role: user_role.USER,
    },
  });

  const cityProfiles = [
    {
      city: '上海',
      cityEn: 'Shanghai',
      districts: ['浦东新区', '黄浦区', '静安区', '徐汇区'],
      attractions: ['外滩', '南京路步行街', '豫园', '陆家嘴中心绿地', '东方明珠'],
      transit: ['人民广场地铁站', '陆家嘴地铁站', '静安寺地铁站', '虹桥火车站'],
    },
    {
      city: '北京',
      cityEn: 'Beijing',
      districts: ['朝阳区', '东城区', '海淀区', '西城区'],
      attractions: ['故宫博物院', '天安门广场', '颐和园', '南锣鼓巷', '三里屯太古里'],
      transit: ['国贸地铁站', '王府井地铁站', '西直门地铁站', '北京南站'],
    },
    {
      city: '广州',
      cityEn: 'Guangzhou',
      districts: ['天河区', '越秀区', '海珠区', '荔湾区'],
      attractions: ['广州塔', '上下九步行街', '沙面', '陈家祠', '珠江夜游码头'],
      transit: ['珠江新城地铁站', '体育西路地铁站', '广州东站', '广州南站'],
    },
    {
      city: '深圳',
      cityEn: 'Shenzhen',
      districts: ['南山区', '福田区', '罗湖区', '宝安区'],
      attractions: ['世界之窗', '深圳湾公园', '欢乐海岸', '东门老街', '莲花山公园'],
      transit: ['福田高铁站', '车公庙地铁站', '深圳北站', '罗湖地铁站'],
    },
    {
      city: '杭州',
      cityEn: 'Hangzhou',
      districts: ['西湖区', '上城区', '拱墅区', '滨江区'],
      attractions: ['西湖', '灵隐寺', '河坊街', '西溪湿地', '钱江新城'],
      transit: ['龙翔桥地铁站', '凤起路地铁站', '杭州东站', '城站火车站'],
    },
    {
      city: '成都',
      cityEn: 'Chengdu',
      districts: ['锦江区', '青羊区', '武侯区', '成华区'],
      attractions: ['春熙路', '宽窄巷子', '武侯祠', '锦里', '成都大熊猫繁育研究基地'],
      transit: ['天府广场地铁站', '春熙路地铁站', '成都东站', '火车南站'],
    },
    {
      city: '东京',
      cityEn: 'Tokyo',
      districts: ['新宿区', '涩谷区', '中央区', '台东区'],
      attractions: ['浅草寺', '东京塔', '上野公园', '银座', '涩谷十字路口'],
      transit: ['新宿站', '东京站', '涩谷站', '上野站'],
    },
    {
      city: '新加坡',
      cityEn: 'Singapore',
      districts: ['滨海湾', '乌节路', '牛车水', '克拉码头'],
      attractions: ['滨海湾花园', '鱼尾狮公园', '圣淘沙', '新加坡摩天观景轮', '金沙购物中心'],
      transit: ['滨海湾地铁站', '政府大厦地铁站', '乌节地铁站', '莱佛士坊地铁站'],
    },
  ];
  const types = ['商务型', '度假型', '精品型', '公寓型', '机场型', '会议型', '设计型'];
  const tagsPool = ['海景', '近地铁', '亲子', '免费停车', '含早餐', '高评分', '商务', '市中心', '安静', '新开业'];
  const roomCatalog = [
    {
      key: 'hostel_bed',
      name: '多人间床位',
      occupancy: 1,
      priceFactor: 0.34,
      roomStockBase: 16,
      roomStockSpan: 20,
      minStar: 1,
      maxStar: 2,
      breakfastBias: 0.1,
      refundableBias: 0.45,
    },
    {
      key: 'single',
      name: '单人房',
      occupancy: 1,
      priceFactor: 0.62,
      roomStockBase: 6,
      roomStockSpan: 10,
      minStar: 1,
      maxStar: 4,
      breakfastBias: 0.35,
      refundableBias: 0.55,
    },
    {
      key: 'queen',
      name: '标准大床房',
      occupancy: 2,
      priceFactor: 0.95,
      roomStockBase: 10,
      roomStockSpan: 14,
      minStar: 1,
      maxStar: 5,
      breakfastBias: 0.45,
      refundableBias: 0.6,
    },
    {
      key: 'twin',
      name: '高级双床房',
      occupancy: 2,
      priceFactor: 1.05,
      roomStockBase: 8,
      roomStockSpan: 12,
      minStar: 2,
      maxStar: 5,
      breakfastBias: 0.48,
      refundableBias: 0.6,
    },
    {
      key: 'view',
      name: '景观大床房',
      occupancy: 2,
      priceFactor: 1.18,
      roomStockBase: 5,
      roomStockSpan: 8,
      minStar: 3,
      maxStar: 5,
      breakfastBias: 0.62,
      refundableBias: 0.68,
    },
    {
      key: 'family',
      name: '家庭房',
      occupancy: 3,
      priceFactor: 1.28,
      roomStockBase: 4,
      roomStockSpan: 6,
      minStar: 2,
      maxStar: 5,
      breakfastBias: 0.66,
      refundableBias: 0.58,
    },
    {
      key: 'family_suite',
      name: '家庭套房',
      occupancy: 4,
      priceFactor: 1.68,
      roomStockBase: 2,
      roomStockSpan: 4,
      minStar: 3,
      maxStar: 5,
      breakfastBias: 0.74,
      refundableBias: 0.7,
    },
    {
      key: 'executive_suite',
      name: '行政套房',
      occupancy: 4,
      priceFactor: 1.95,
      roomStockBase: 2,
      roomStockSpan: 3,
      minStar: 4,
      maxStar: 5,
      breakfastBias: 0.8,
      refundableBias: 0.75,
    },
    {
      key: 'presidential',
      name: '尊享套房',
      occupancy: 5,
      priceFactor: 2.85,
      roomStockBase: 1,
      roomStockSpan: 2,
      minStar: 5,
      maxStar: 5,
      breakfastBias: 0.9,
      refundableBias: 0.82,
    },
  ] as const;
  const hotelPrefixes = ['易宿', '云庭', '栖岸', '泊悦', '行舍', '悦栈', '锦程', '澜庭'];
  const hotelDescriptors = ['国际', '城市', '精选', '中心', '花园', '雅居', '臻选', '商务', '艺术', '轻奢'];
  const hotelSuffixes = ['酒店', '大酒店', '公寓酒店', '酒店公寓', '套房酒店', '旅居酒店'];
  const streetNames = ['人民路', '解放路', '中山路', '建设大道', '金融街', '滨江路', '太古里大街', '湖滨路'];
  const cityPriceFactor: Record<string, number> = {
    上海: 1.45,
    北京: 1.42,
    广州: 1.18,
    深圳: 1.32,
    杭州: 1.16,
    成都: 1.05,
    东京: 1.62,
    新加坡: 1.75,
  };
  const districtTierByCity: Record<string, number[]> = {
    上海: [1.28, 1.22, 1.12, 1.08],
    北京: [1.24, 1.18, 1.14, 1.05],
    广州: [1.20, 1.08, 1.12, 1.02],
    深圳: [1.22, 1.18, 1.06, 0.98],
    杭州: [1.16, 1.08, 1.02, 1.00],
    成都: [1.14, 1.04, 1.10, 0.98],
    东京: [1.30, 1.22, 1.18, 1.06],
    新加坡: [1.26, 1.22, 1.08, 1.16],
  };
  const typePriceFactor: Record<string, number> = {
    商务型: 1.08,
    度假型: 1.18,
    精品型: 1.12,
    公寓型: 0.98,
    机场型: 1.04,
    会议型: 1.15,
    设计型: 1.20,
  };
  const calcDistanceKm = (seed: number, min: number, max: number, step = 0.1) => {
    const steps = Math.max(1, Math.floor((max - min) / step));
    // 用一个与状态分布弱相关的扰动，避免大量酒店距离完全相同
    const idx = Math.abs((seed * 37 + 17) % (steps + 1));
    return Number((min + idx * step).toFixed(1));
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const calendarDays = Array.from({ length: calendarDayCount }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  // 2) 批量生成酒店（默认约 5000 家，可通过环境变量覆盖）
  const hotels: Array<{
    id: string;
    status: hotel_status;
    city: string;
    star: number;
    type: string;
    districtIndex: number;
    hotelTier: number;
    ratingSeed: number;
  }> = [];
  for (let i = 1; i <= hotelTarget; i += 1) {
    let status: hotel_status = hotel_status.APPROVED;
    if (i % 10 === 0) status = hotel_status.OFFLINE;
    else if (i % 6 === 0) status = hotel_status.PENDING;
    else if (i % 15 === 0) status = hotel_status.REJECTED;
    else if (i % 22 === 0) status = hotel_status.DRAFT;

    const merchant = merchants[i % merchants.length];
    const profile = cityProfiles[i % cityProfiles.length];
    const city = profile.city;
    const type = types[i % types.length];
    const star = (i % 5) + 1;
    const openYear = 2008 + (i % 17);
    const openMonth = (i % 12) + 1;
    const openDay = (i % 27) + 1;
    const openDateIso = `${openYear}-${String(openMonth).padStart(2, '0')}-${String(openDay).padStart(2, '0')}T00:00:00.000Z`;
    const districtIndex = i % profile.districts.length;
    const district = profile.districts[districtIndex];
    const attractionName = profile.attractions[i % profile.attractions.length];
    const transitName = profile.transit[i % profile.transit.length];
    const hotelNo = i.toString().padStart(4, '0');
    const streetNo = 100 + i;
    const hotelTier = ((i * 17 + star * 13 + districtIndex * 7) % 100) / 100; // 0-0.99
    const attractionDistance = calcDistanceKm(i + attractionName.length * 11 + city.length * 7, 0.3, 5.8, 0.1);
    const transitDistance = calcDistanceKm(i + transitName.length * 13 + city.length * 5, 0.1, 3.2, 0.1);
    const secondAttraction = profile.attractions[(i + 2) % profile.attractions.length];
    const secondAttractionDistance = calcDistanceKm(i + secondAttraction.length * 19 + city.length * 9, 0.7, 10.0, 0.1);
    const proximityPremium =
      (transitDistance <= 0.5 ? 0.16 : transitDistance <= 1 ? 0.1 : transitDistance <= 2 ? 0.04 : -0.03) +
      (attractionDistance <= 0.8 ? 0.12 : attractionDistance <= 1.6 ? 0.06 : attractionDistance <= 3 ? 0.02 : -0.02);
    const hotelNameCn = `${hotelPrefixes[i % hotelPrefixes.length]}${city}${district}${hotelDescriptors[(i + star) % hotelDescriptors.length]}${hotelSuffixes[i % hotelSuffixes.length]}${hotelTier > 0.88 ? '·尊享' : hotelTier < 0.18 ? '·轻居' : ''}-${hotelNo}`;
    const ratingBase =
      3.9 +
      (star - 3) * 0.28 +
      (type === '度假型' || type === '设计型' ? 0.12 : 0) +
      (hotelTier > 0.8 ? 0.18 : hotelTier < 0.2 ? -0.12 : 0) +
      Math.max(-0.08, Math.min(0.12, proximityPremium * 0.5));
    const ratingJitter = (((i * 29 + districtIndex * 11) % 13) - 6) * 0.05;
    const rating = Math.max(3.2, Math.min(5.0, Number((ratingBase + ratingJitter).toFixed(1))));
    const reviewCount =
      8 +
      Math.floor(Math.pow(((i * 31 + star * 17) % 100) / 100, 1.7) * 1800) +
      star * 6;

    const created = await prisma.hotels.create({
      data: {
        name_cn: hotelNameCn,
        name_en: `EasyStay ${profile.cityEn} ${hotelDescriptors[(i + star) % hotelDescriptors.length]} ${hotelSuffixes[i % hotelSuffixes.length]} ${hotelNo}`,
        address: `${city}${district}${streetNames[i % streetNames.length]}${streetNo}号`,
        city,
        star,
        type,
        open_year: openDateIso,
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
            {
              type: 'attraction',
              name: attractionName,
              distance_km: attractionDistance,
            },
            {
              type: 'metro',
              name: transitName,
              distance_km: transitDistance,
            },
            {
              type: 'attraction',
              name: secondAttraction,
              distance_km: secondAttractionDistance,
            },
          ],
        },
        review_summary: {
          create: {
            rating,
            review_count: reviewCount,
          },
        },
      },
    });
    hotels.push({
      id: created.id,
      status: created.status,
      city,
      star,
      type,
      districtIndex,
      hotelTier,
      ratingSeed: rating,
    });
  }

  // 3) 批量生成房型 + 价格 + 库存
  const roomIds: string[] = [];
  for (let i = 0; i < hotels.length; i += 1) {
    const hotel = hotels[i];
    const profile = cityProfiles.find(p => p.city === hotel.city)!;
    const attractionName = profile.attractions[i % profile.attractions.length];
    const transitName = profile.transit[i % profile.transit.length];
    const attractionDistance = calcDistanceKm(i + attractionName.length * 11 + hotel.city.length * 7, 0.3, 5.8, 0.1);
    const transitDistance = calcDistanceKm(i + transitName.length * 13 + hotel.city.length * 5, 0.1, 3.2, 0.1);
    const proximityPriceFactor =
      1 +
      (transitDistance <= 0.5 ? 0.18 : transitDistance <= 1 ? 0.1 : transitDistance <= 2 ? 0.04 : -0.03) +
      (attractionDistance <= 0.8 ? 0.12 : attractionDistance <= 1.6 ? 0.06 : attractionDistance <= 3 ? 0.02 : -0.02);

    const eligibleRooms = roomCatalog.filter(
      (room) => hotel.star >= room.minStar && hotel.star <= room.maxStar,
    );
    const desiredRoomCount = hotel.star >= 4 ? 4 + (i % 2) : 2 + (i % 3);
    const selectedRooms = eligibleRooms.slice(0, Math.min(desiredRoomCount, eligibleRooms.length));

    for (let r = 0; r < selectedRooms.length; r += 1) {
      const roomTemplate = selectedRooms[r];
      const cityFactor = cityPriceFactor[hotel.city] ?? 1;
      const districtFactor = districtTierByCity[hotel.city]?.[hotel.districtIndex] ?? 1;
      const typeFactor = typePriceFactor[hotel.type] ?? 1;
      const starFactor = 0.72 + hotel.star * 0.28;
      const luxuryBoost = hotel.hotelTier > 0.85 ? 1.28 : hotel.hotelTier < 0.18 ? 0.85 : 1;
      const seedFactor = 0.92 + (((i * 37 + r * 71) % 31) / 100); // 0.92 ~ 1.22
      const basePrice = Math.max(
        roomTemplate.key === 'hostel_bed' ? 2800 : 6800,
        Math.round(
          11000 *
            cityFactor *
            districtFactor *
            typeFactor *
            starFactor *
            roomTemplate.priceFactor *
            proximityPriceFactor *
            luxuryBoost *
            seedFactor,
        ),
      );
      const totalRooms =
        roomTemplate.roomStockBase + ((i + r * 3) % roomTemplate.roomStockSpan);
      const breakfastValue = (i * 11 + r * 17) % 100 < roomTemplate.breakfastBias * 100;
      const refundableValue = (i * 13 + r * 19) % 100 < roomTemplate.refundableBias * 100;
      const occupancyNoise = roomTemplate.occupancy >= 3 && hotel.hotelTier > 0.75 ? 1 : 0;
      const maxOccupancy = Math.min(6, roomTemplate.occupancy + occupancyNoise);

      const room = await prisma.rooms.create({
        data: {
          hotel_id: hotel.id,
          name: `${roomTemplate.name}${hotel.hotelTier > 0.9 && r >= 2 ? '（高层）' : ''}-${r + 1}`,
          max_occupancy: maxOccupancy,
          total_rooms: totalRooms,
          base_price: basePrice,
          refundable: refundableValue,
          breakfast: breakfastValue,
        },
      });
      roomIds.push(room.id);

      await prisma.price_calendar.createMany({
        data: calendarDays.map((d, idx) => ({
          room_id: room.id,
          date: d,
          price:
            basePrice +
            (idx % 8) * (180 + (hotel.star * 20)) +
            (i % 5) * 95 +
            (hotel.city === '东京' || hotel.city === '新加坡' ? 260 : 0) +
            (roomTemplate.key.includes('suite') ? Math.round(basePrice * 0.04) : 0) +
            (roomTemplate.key === 'hostel_bed' ? -120 : 0) +
            (idx % 6 === 5 ? Math.round(basePrice * 0.08) : 0),
          promo_type: idx % 7 === 0 ? 'DISCOUNT' : null,
          promo_value: idx % 14 === 0 ? 18 : idx % 7 === 0 ? 10 : null,
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

  // 4) 生成演示订单（默认约 80 条，可通过环境变量覆盖），仅在已上架酒店上创建
  const approvedHotels = hotels.filter((h) => h.status === hotel_status.APPROVED);
  const approvedHotelSet = new Set(approvedHotels.map((h) => h.id));
  const approvedRooms = await prisma.rooms.findMany({
    where: { hotel_id: { in: Array.from(approvedHotelSet) } },
    select: { id: true, hotel_id: true, base_price: true },
    take: Math.max(200, bookingTarget * 2),
  });

  const bookingsToCreate = approvedRooms.slice(0, bookingTarget);
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
        contact_name: `演示用户${i + 1}`,
        contact_phone: `1880000${(1000 + i).toString().slice(-4)}`,
      },
    });
  }

  const hotelCount = await prisma.hotels.count();
  const roomCount = await prisma.rooms.count();
  const bookingCount = await prisma.bookings.count();

  console.log('✅ Seed done');
  console.log(`Seed config: hotels=${hotelTarget}, calendar_days=${calendarDayCount}, bookings=${bookingTarget}`);
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
