/**
 * 文件说明：该文件定义了端到端测试，覆盖主要 API 业务流程。
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { user_role } from '@prisma/client';

jest.setTimeout(120000);

describe('EasyStay API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const base = () => request(app.getHttpServer());

  // test data
  const merchantEmail = `merchant_${Date.now()}@test.com`;
  const adminEmail = `admin_${Date.now()}@test.com`;
  const password = 'Test12345!';

  let merchantToken = '';
  let adminToken = '';

  let hotelId = '';
  let rejectHotelId = '';
  let roomId = '';
  let bookingId = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    prisma = app.get(PrismaService);

    await app.init();

    // ⚠️ 清库（按外键关系顺序）
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
  });

  afterAll(async () => {
    await app.close();
  });

  // 测试健康检查接口：GET /health，应返回服务存活状态
  it('GET /health should return ok', async () => {
    const res = await base().get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  // 测试商家认证流程：POST /auth/register + POST /auth/login + GET /auth/me
  it('Auth: register merchant + login', async () => {
    await base()
      .post('/auth/register')
      .send({ email: merchantEmail, password, role: 'MERCHANT' })
      .expect(201); // Nest 默认 POST 可能是 201，如果你返回 200，就把这里改成 200

    const login = await base()
      .post('/auth/login')
      .send({ email: merchantEmail, password })
      .expect(201);

    expect(login.body.access_token).toBeTruthy();
    merchantToken = login.body.access_token;

    const me = await base()
      .get('/auth/me')
      .set('Authorization', `Bearer ${merchantToken}`)
      .expect(200);

    expect(me.body.email).toBe(merchantEmail);
    expect(me.body.role).toBe('MERCHANT');
  });

  // 测试管理员认证流程：前台注册应被拒绝；系统创建后可登录
  it('Auth: admin public register blocked + login seeded admin', async () => {
    await base()
      .post('/auth/register')
      .send({ email: adminEmail, password, role: 'ADMIN' })
      .expect(400);

    const adminHash = await bcrypt.hash(password, 10);
    await prisma.users.create({
      data: {
        email: adminEmail,
        password: adminHash,
        role: user_role.ADMIN,
      },
    });

    const login = await base()
      .post('/auth/login')
      .send({ email: adminEmail, password })
      .expect(201);

    expect(login.body.access_token).toBeTruthy();
    adminToken = login.body.access_token;

    const me = await base()
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(me.body.email).toBe(adminEmail);
    expect(me.body.role).toBe('ADMIN');
  });

  // 测试商家创建酒店：POST /merchant/hotels
  it('Merchant: create hotel', async () => {
    const res = await base()
      .post('/merchant/hotels')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        name_cn: '测试酒店',
        name_en: 'Test Hotel',
        address: '1 Test St',
        city: 'Sydney',
        star: 5,
        type: 'Resort',
        open_year: 2020,
        status: 'DRAFT',
      })
      .expect(201);

    expect(res.body.id).toBeTruthy();
    hotelId = res.body.id;
  });

  // 测试商家信息与酒店列表：GET /merchant/me + GET /merchant/hotels
  it('Merchant: me + my hotels', async () => {
    const me = await base()
      .get('/merchant/me')
      .set('Authorization', `Bearer ${merchantToken}`)
      .expect(200);

    expect(me.body.email).toBe(merchantEmail);
    expect(me.body.role).toBe('MERCHANT');

    const hotels = await base()
      .get('/merchant/hotels')
      .set('Authorization', `Bearer ${merchantToken}`)
      .expect(200);

    expect(Array.isArray(hotels.body)).toBe(true);
    expect(hotels.body.some((h: any) => h.id === hotelId)).toBe(true);
  });

  // 测试商家设置酒店图片与标签：POST /merchant/hotels/:id/images + POST /merchant/hotels/:id/tags
  it('Merchant: set images + tags', async () => {
    await base()
      .post(`/merchant/hotels/${hotelId}/images`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        items: [
          { url: 'https://example.com/1.jpg', sort: 0 },
          { url: 'https://example.com/2.jpg', sort: 1 },
        ],
      })
      .expect(201);

    await base()
      .post(`/merchant/hotels/${hotelId}/tags`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ tags: ['海景', '近地铁'] })
      .expect(201);
  });

  // 测试商家创建房型并写入价格日历：POST /merchant/hotels/:id/rooms + POST /merchant/rooms/:roomId/prices
  it('Merchant: create room + upsert price', async () => {
    const room = await base()
      .post(`/merchant/hotels/${hotelId}/rooms`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        name: 'Deluxe King',
        max_occupancy: 2,
        total_rooms: 8,
        base_price: 500,
        refundable: true,
        breakfast: false,
      })
      .expect(201);

    roomId = room.body.id;
    expect(roomId).toBeTruthy();

    const date = new Date().toISOString();

    const price = await base()
      .post(`/merchant/rooms/${roomId}/prices`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        date,
        price: 520,
        promo_type: 'DISCOUNT',
        promo_value: 10,
      })
      .expect(201);

    expect(price.body.room_id).toBe(roomId);
    expect(price.body.price).toBe(520);
  });

  // 测试商家提交酒店审核：PATCH /merchant/hotels/:id（状态改为 PENDING）
  it('Merchant: submit hotel -> PENDING (via PATCH update status)', async () => {
    const res = await base()
      .patch(`/merchant/hotels/${hotelId}`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        name_cn: '测试酒店',
        name_en: 'Test Hotel',
        address: '1 Test St',
        city: 'Sydney',
        star: 5,
        type: 'Resort',
        open_year: 2020,
        status: 'PENDING',
      })
      .expect(200);

    expect(res.body.status).toBe('PENDING');
  });

  // 测试管理员审核通过流程：GET /admin/hotels/pending + POST /admin/hotels/:id/approve
  it('Admin: list pending -> approve', async () => {
    const pending = await base()
      .get('/admin/hotels/pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const found = pending.body.find((h: any) => h.id === hotelId);
    expect(found).toBeTruthy();

    const approved = await base()
      .post(`/admin/hotels/${hotelId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);

    expect(approved.body.status).toBe('APPROVED');
  });

  // 测试管理员设置并查询库存：POST /admin/rooms/:roomId/inventory + GET /admin/rooms/:roomId/inventory
  it('Admin: set/get room inventory', async () => {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    target.setHours(0, 0, 0, 0);

    const set = await base()
      .post(`/admin/rooms/${roomId}/inventory`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        date: target.toISOString(),
        total_rooms: 8,
        blocked_rooms: 2,
      })
      .expect(201);

    expect(set.body.room_id).toBe(roomId);
    expect(set.body.blocked_rooms).toBe(2);

    const inv = await base()
      .get(`/admin/rooms/${roomId}/inventory?from=${target.toISOString()}&to=${target.toISOString()}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(inv.body)).toBe(true);
    expect(inv.body[0].room_id).toBe(roomId);
    expect(inv.body[0].available_rooms).toBe(6);
  });

  // 准备管理员拒绝场景：商家再创建一个待审核酒店（POST /merchant/hotels）
  it('Merchant: create another pending hotel for reject', async () => {
    const res = await base()
      .post('/merchant/hotels')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        name_cn: '待拒绝酒店',
        name_en: 'Reject Hotel',
        address: '2 Test St',
        city: 'Sydney',
        star: 4,
        type: 'Business',
        open_year: 2021,
        status: 'PENDING',
      })
      .expect(201);

    rejectHotelId = res.body.id;
    expect(rejectHotelId).toBeTruthy();
  });

  // 测试管理员拒绝酒店：POST /admin/hotels/:id/reject
  it('Admin: reject pending hotel', async () => {
    const rejected = await base()
      .post(`/admin/hotels/${rejectHotelId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: '资料不完整' })
      .expect(201);

    expect(rejected.body.id).toBe(rejectHotelId);
    expect(rejected.body.status).toBe('REJECTED');
    expect(rejected.body.reject_reason).toBe('资料不完整');
  });

  // 测试公开酒店列表：GET /hotels，验证可检索到已审核通过酒店
  it('Public: hotels list should include approved hotel', async () => {
    const list = await base()
      .get('/hotels?city=Sydney&keyword=测试&page=1&limit=20')
      .expect(200);

    expect(Array.isArray(list.body.items)).toBe(true);
    const found = list.body.items.find((x: any) => x.id === hotelId);
    expect(found).toBeTruthy();
  });

  // 测试公开酒店详情：GET /hotels/:id，验证包含房型、图片、标签
  it('Public: hotel detail should include rooms/images/tags', async () => {
    const detail = await base()
      .get(`/hotels/${hotelId}`)
      .expect(200);

    expect(detail.body.id).toBe(hotelId);
    expect(Array.isArray(detail.body.hotel_images)).toBe(true);
    expect(Array.isArray(detail.body.hotel_tags)).toBe(true);
    expect(Array.isArray(detail.body.rooms)).toBe(true);
    expect(detail.body.rooms[0].max_occupancy).toBeTruthy();
  });

  // 测试公开房型价格日历：GET /hotels/rooms/:roomId/prices
  it('Public: room prices should return array', async () => {
    const prices = await base()
      .get(`/hotels/rooms/${roomId}/prices`)
      .expect(200);

    expect(Array.isArray(prices.body)).toBe(true);
    expect(prices.body.length).toBeGreaterThanOrEqual(1);
    expect(prices.body[0].room_id).toBe(roomId);
  });

  // 测试公开房量查询：GET /hotels/rooms/:roomId/availability
  it('Public: room availability should return available rooms', async () => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 1);
    checkIn.setHours(0, 0, 0, 0);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 2);

    const res = await base()
      .get(
        `/hotels/rooms/${roomId}/availability?check_in=${checkIn.toISOString()}&check_out=${checkOut.toISOString()}&rooms_count=1`,
      )
      .expect(200);

    expect(res.body.room_id).toBe(roomId);
    expect(res.body.is_available).toBe(true);
    expect(res.body.available_rooms).toBeGreaterThanOrEqual(1);
  });

  // 测试创建预订：POST /bookings（会占用库存）
  it('Booking: create booking', async () => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 1);
    checkIn.setHours(0, 0, 0, 0);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 2);

    const created = await base()
      .post('/bookings')
      .send({
        hotel_id: hotelId,
        room_id: roomId,
        check_in: checkIn.toISOString(),
        check_out: checkOut.toISOString(),
        rooms_count: 1,
        guest_count: 2,
        contact_name: 'Alice',
        contact_phone: '18800001111',
      })
      .expect(201);

    bookingId = created.body.id;
    expect(bookingId).toBeTruthy();
    expect(created.body.status).toBe('CONFIRMED');
  });

  // 测试预订详情：GET /bookings/:id
  it('Booking: get detail', async () => {
    const detail = await base().get(`/bookings/${bookingId}`).expect(200);
    expect(detail.body.id).toBe(bookingId);
    expect(detail.body.hotel_id).toBe(hotelId);
    expect(detail.body.room_id).toBe(roomId);
  });

  // 测试取消预订：PATCH /bookings/:id/cancel（释放库存）
  it('Booking: cancel booking', async () => {
    const canceled = await base().patch(`/bookings/${bookingId}/cancel`).expect(200);
    expect(canceled.body.status).toBe('CANCELLED');
  });

  // 测试登出接口：POST /auth/logout
  it('Auth: logout', async () => {
    const res = await base()
      .post('/auth/logout')
      .set('Authorization', `Bearer ${merchantToken}`)
      .expect(201);

    expect(res.body).toEqual({ status: 'ok' });
  });
});
