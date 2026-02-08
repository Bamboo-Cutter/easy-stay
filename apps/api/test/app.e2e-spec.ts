import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('EasyStay API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const base = () => request(app.getHttpServer());

  // test data
  const merchantEmail = `merchant_${Date.now()}@test.com`;
  const adminEmail = `admin_${Date.now()}@test.com`;
  const password = '123456';

  let merchantToken = '';
  let adminToken = '';

  let hotelId = '';
  let roomId = '';

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

  it('GET /health should return ok', async () => {
    const res = await base().get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('Auth: register merchant + login', async () => {
    await base()
      .post('/auth/register')
      .send({ email: merchantEmail, password, role: 'MERCHANT' })
      .expect(201); // Nest 默认 POST 可能是 201，如果你返回 200，就把这里改成 200

    const login = await base()
      .post('/auth/login')
      .send({ email: merchantEmail, password })
      .expect(201);

    expect(login.body.accessToken).toBeTruthy();
    merchantToken = login.body.accessToken;

    const me = await base()
      .get('/auth/me')
      .set('Authorization', `Bearer ${merchantToken}`)
      .expect(200);

    expect(me.body.email).toBe(merchantEmail);
    expect(me.body.role).toBe('MERCHANT');
  });

  it('Auth: register admin + login', async () => {
    await base()
      .post('/auth/register')
      .send({ email: adminEmail, password, role: 'ADMIN' })
      .expect(201);

    const login = await base()
      .post('/auth/login')
      .send({ email: adminEmail, password })
      .expect(201);

    expect(login.body.accessToken).toBeTruthy();
    adminToken = login.body.accessToken;

    const me = await base()
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(me.body.email).toBe(adminEmail);
    expect(me.body.role).toBe('ADMIN');
  });

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

  it('Merchant: create room + upsert price', async () => {
    const room = await base()
      .post(`/merchant/hotels/${hotelId}/rooms`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        name: 'Deluxe King',
        capacity: 2,
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

  it('Public: hotels list should include approved hotel', async () => {
    const list = await base()
      .get('/hotels?city=Sydney&keyword=测试&page=1&limit=20')
      .expect(200);

    expect(Array.isArray(list.body.items)).toBe(true);
    const found = list.body.items.find((x: any) => x.id === hotelId);
    expect(found).toBeTruthy();
  });

  it('Public: hotel detail should include rooms/images/tags', async () => {
    const detail = await base()
      .get(`/hotels/${hotelId}`)
      .expect(200);

    expect(detail.body.id).toBe(hotelId);
    expect(Array.isArray(detail.body.hotel_images)).toBe(true);
    expect(Array.isArray(detail.body.hotel_tags)).toBe(true);
    expect(Array.isArray(detail.body.rooms)).toBe(true);
  });

  it('Public: room prices should return array', async () => {
    const prices = await base()
      .get(`/hotels/rooms/${roomId}/prices`)
      .expect(200);

    expect(Array.isArray(prices.body)).toBe(true);
    expect(prices.body.length).toBeGreaterThanOrEqual(1);
    expect(prices.body[0].room_id).toBe(roomId);
  });
});
