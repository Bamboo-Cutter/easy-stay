#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..');
const apiRoot = path.resolve(repoRoot, 'apps/api');
const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

async function req(method, route, { body, token } = {}) {
  const res = await fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function okStatus(status) {
  return status >= 200 && status < 300;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function scanApiSrcCompiledJs() {
  const srcDir = path.join(apiRoot, 'src');
  const found = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) walk(p);
      else if (name.endsWith('.js')) found.push(path.relative(repoRoot, p));
    }
  }
  walk(srcDir);
  return found;
}

function normalizeAdminApiPath(raw) {
  // admin-web often calls /api/* and Vite rewrites to backend root
  if (!raw) return raw;
  if (raw.startsWith('/api/')) return raw.replace(/^\/api/, '');
  if (raw.startsWith('api/')) return raw.replace(/^api/, '');
  return raw;
}

function frontendContractAudit() {
  const report = {
    userMobile: { wrappers: [], directCalls: [] },
    adminWeb: { authWrappers: [], pageCalls: [], dynamicCalls: [] },
    unmatched: [],
  };

  const userApiFile = path.join(repoRoot, 'user-mobile/src/utils/api.js');
  const adminAuthFile = path.join(repoRoot, 'admin-web/src/api/auth.js');

  const userApiText = readText(userApiFile);
  const userMatches = [...userApiText.matchAll(/request\('([A-Z]+)',\s*'([^']+)'/g)];
  report.userMobile.wrappers = userMatches.map((m) => ({ method: m[1], path: m[2] }));

  const userMobilePageFiles = [];
  function walkJsxJs(dir, out) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) walkJsxJs(p, out);
      else if (name.endsWith('.jsx') || name.endsWith('.js')) out.push(p);
    }
  }
  walkJsxJs(path.join(repoRoot, 'user-mobile/src/pages'), userMobilePageFiles);
  for (const file of userMobilePageFiles) {
    const txt = readText(file);
    if (/\bfetch\s*\(/.test(txt) || /\bTaro\.request\s*\(/.test(txt)) {
      report.userMobile.directCalls.push(path.relative(repoRoot, file));
    }
  }

  const adminAuthText = readText(adminAuthFile);
  const adminAuthMatches = [...adminAuthText.matchAll(/api\.(get|post|patch)\("([^"]+)"|api\.(get|post|patch)\('([^']+)'/g)];
  report.adminWeb.authWrappers = adminAuthMatches.map((m) => ({
    method: (m[1] || m[3]).toUpperCase(),
    path: m[2] || m[4],
  }));

  const pageFiles = [];
  function walkPages(dir) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) walkPages(p);
      else if (name.endsWith('.jsx')) pageFiles.push(p);
    }
  }
  walkPages(path.join(repoRoot, 'admin-web/src/pages'));

  for (const file of pageFiles) {
    const txt = readText(file);
    const literalMatches = [
      ...txt.matchAll(/axios\.(get|post|patch)\(\s*`([^`]+)`/g),
      ...txt.matchAll(/axios\.(get|post|patch)\(\s*"([^"]+)"/g),
      ...txt.matchAll(/axios\.(get|post|patch)\(\s*'([^']+)'/g),
    ];
    for (const m of literalMatches) {
      report.adminWeb.pageCalls.push({
        file: path.relative(repoRoot, file),
        method: m[1].toUpperCase(),
        path: normalizeAdminApiPath(m[2]),
      });
    }

    const dynamicMatches = [...txt.matchAll(/axios\.(get|post|patch)\(\s*([a-zA-Z_$][\w$]*)/g)];
    for (const m of dynamicMatches) {
      report.adminWeb.dynamicCalls.push({
        file: path.relative(repoRoot, file),
        method: m[1].toUpperCase(),
        variable: m[2],
      });
    }
  }

  const backendPatterns = [
    { method: 'GET', re: /^\/health$/ },
    { method: 'POST', re: /^\/auth\/register$/ },
    { method: 'POST', re: /^\/auth\/login$/ },
    { method: 'GET', re: /^\/auth\/me$/ },
    { method: 'POST', re: /^\/auth\/logout$/ },
    { method: 'GET', re: /^\/hotels$/ },
    { method: 'GET', re: /^\/hotels\/suggestions$/ },
    { method: 'GET', re: /^\/hotels\/featured$/ },
    { method: 'GET', re: /^\/hotels\/banners$/ },
    { method: 'GET', re: /^\/hotels\/filter-metadata$/ },
    { method: 'GET', re: /^\/hotels\/rooms\/[^/]+\/prices$/ },
    { method: 'GET', re: /^\/hotels\/rooms\/[^/]+\/availability$/ },
    { method: 'GET', re: /^\/hotels\/[^/]+\/offers$/ },
    { method: 'GET', re: /^\/hotels\/[^/]+\/calendar$/ },
    { method: 'GET', re: /^\/hotels\/[^/]+\/reviews-summary$/ },
    { method: 'GET', re: /^\/hotels\/[^/]+$/ },
    { method: 'POST', re: /^\/bookings$/ },
    { method: 'GET', re: /^\/bookings\/[^/]+$/ },
    { method: 'PATCH', re: /^\/bookings\/[^/]+\/cancel$/ },
    { method: 'GET', re: /^\/merchant\/me$/ },
    { method: 'GET', re: /^\/merchant\/hotels$/ },
    { method: 'GET', re: /^\/merchant\/hotels\/[^/]+$/ },
    { method: 'POST', re: /^\/merchant\/hotels$/ },
    { method: 'PATCH', re: /^\/merchant\/hotels\/[^/]+$/ },
    { method: 'PATCH', re: /^\/merchant\/hotels\/[^/]+\/status$/ },
    { method: 'POST', re: /^\/merchant\/hotels\/[^/]+\/images$/ },
    { method: 'POST', re: /^\/merchant\/hotels\/[^/]+\/tags$/ },
    { method: 'POST', re: /^\/merchant\/hotels\/[^/]+\/rooms$/ },
    { method: 'POST', re: /^\/merchant\/rooms\/[^/]+\/prices$/ },
    { method: 'GET', re: /^\/admin\/hotels$/ },
    { method: 'POST', re: /^\/admin\/hotels$/ },
    { method: 'PATCH', re: /^\/admin\/hotels\/[^/]+$/ },
    { method: 'GET', re: /^\/admin\/hotels\/pending$/ },
    { method: 'GET', re: /^\/admin\/hotels\/[^/]+$/ },
    { method: 'GET', re: /^\/admin\/merchants\/[^/]+\/hotels$/ },
    { method: 'POST', re: /^\/admin\/hotels\/[^/]+\/approve$/ },
    { method: 'POST', re: /^\/admin\/hotels\/[^/]+\/reject$/ },
    { method: 'PATCH', re: /^\/admin\/hotels\/[^/]+\/reject$/ },
    { method: 'PATCH', re: /^\/admin\/hotels\/[^/]+\/status$/ },
    { method: 'GET', re: /^\/admin\/rooms\/[^/]+\/inventory$/ },
    { method: 'POST', re: /^\/admin\/rooms\/[^/]+\/inventory$/ },
  ];

  const allFrontendCalls = [
    ...report.userMobile.wrappers,
    ...report.adminWeb.authWrappers,
    ...report.adminWeb.pageCalls.map(({ method, path, file }) => ({ method, path, file })),
  ];

  for (const call of allFrontendCalls) {
    const pathValue = call.path;
    if (!pathValue || pathValue.includes('${')) continue; // dynamic template, skip exact validation
    const matched = backendPatterns.some((p) => p.method === call.method && p.re.test(pathValue));
    if (!matched) report.unmatched.push(call);
  }

  return report;
}

async function runtimeRoleFlows() {
  const stamp = Date.now();
  const testTag = `E2E-${String(stamp).slice(-6)}`;
  const checkIn = inDays(1);
  const checkOut = inDays(2);

  const out = {
    meta: { run_at: new Date().toISOString(), baseUrl, testTag, checkIn, checkOut },
    merchant: {},
    admin: {},
    user: {},
    crossFlow: {},
  };

  const health = await req('GET', '/health');
  out.meta.health = { status: health.status, body: health.data };
  assert(okStatus(health.status), 'health failed');

  const merchantLogin = await req('POST', '/auth/login', {
    body: { email: 'merchant1@demo.com', password: 'Merchant12345!' },
  });
  assert(okStatus(merchantLogin.status), `merchant login failed: ${JSON.stringify(merchantLogin.data)}`);
  const merchantToken = merchantLogin.data.access_token;
  out.merchant.login = {
    status: merchantLogin.status,
    role: merchantLogin.data?.user?.role,
    email: merchantLogin.data?.user?.email,
  };

  const merchantMe = await req('GET', '/merchant/me', { token: merchantToken });
  const merchantHotelsBefore = await req('GET', '/merchant/hotels', { token: merchantToken });
  out.merchant.me = { status: merchantMe.status, id: merchantMe.data?.id, email: merchantMe.data?.email };
  out.merchant.beforeList = {
    status: merchantHotelsBefore.status,
    count: Array.isArray(merchantHotelsBefore.data) ? merchantHotelsBefore.data.length : null,
  };

  const createHotel = await req('POST', '/merchant/hotels', {
    token: merchantToken,
    body: {
      name_cn: `${testTag} 成都联调酒店`,
      name_en: `${testTag} Chengdu Test Hotel`,
      address: '成都市锦江区测试大道88号',
      city: '成都',
      star: 4,
      type: '商务型',
      open_year: '2023-06-01T00:00:00.000Z',
      status: 'DRAFT',
      nearby_points: [
        { type: 'metro', name: '春熙路地铁站', distance_km: 0.7 },
        { type: 'attraction', name: '春熙路', distance_km: 0.5 },
      ],
    },
  });
  assert(okStatus(createHotel.status), `merchant create hotel failed: ${JSON.stringify(createHotel.data)}`);
  const hotelId = createHotel.data.id;
  out.merchant.createHotel = { status: createHotel.status, hotelId, hotelStatus: createHotel.data?.status };

  const setImages = await req('POST', `/merchant/hotels/${hotelId}/images`, {
    token: merchantToken,
    body: { items: [{ url: `https://picsum.photos/seed/${testTag}/800/600`, sort: 0 }] },
  });
  const setTags = await req('POST', `/merchant/hotels/${hotelId}/tags`, {
    token: merchantToken,
    body: { tags: ['近地铁', '商务', testTag] },
  });
  out.merchant.setImages = { status: setImages.status };
  out.merchant.setTags = { status: setTags.status };

  const createRoom = await req('POST', `/merchant/hotels/${hotelId}/rooms`, {
    token: merchantToken,
    body: {
      name: '联调大床房',
      max_occupancy: 2,
      total_rooms: 8,
      base_price: 26800,
      refundable: true,
      breakfast: true,
    },
  });
  assert(okStatus(createRoom.status), `merchant create room failed: ${JSON.stringify(createRoom.data)}`);
  const roomId = createRoom.data.id;
  out.merchant.createRoom = { status: createRoom.status, roomId };

  const upsertPrice = await req('POST', `/merchant/rooms/${roomId}/prices`, {
    token: merchantToken,
    body: {
      date: `${checkIn}T00:00:00.000Z`,
      price: 29900,
      promo_type: 'DISCOUNT',
      promo_value: 5,
    },
  });
  out.merchant.upsertPrice = { status: upsertPrice.status, price: upsertPrice.data?.price };

  const updateHotel = await req('PATCH', `/merchant/hotels/${hotelId}`, {
    token: merchantToken,
    body: { name_cn: `${testTag} 成都联调酒店（提审版）` },
  });
  const submitPending = await req('PATCH', `/merchant/hotels/${hotelId}/status`, {
    token: merchantToken,
    body: { status: 'PENDING' },
  });
  const merchantHotelDetail = await req('GET', `/merchant/hotels/${hotelId}`, { token: merchantToken });
  out.merchant.updateHotel = { status: updateHotel.status, name_cn: updateHotel.data?.name_cn };
  out.merchant.submitPending = { status: submitPending.status, hotelStatus: submitPending.data?.status };
  out.merchant.hotelDetail = {
    status: merchantHotelDetail.status,
    hotelStatus: merchantHotelDetail.data?.status,
    roomCount: merchantHotelDetail.data?.rooms?.length ?? null,
  };

  const adminLogin = await req('POST', '/auth/login', {
    body: { email: 'admin@demo.com', password: 'Admin12345!' },
  });
  assert(okStatus(adminLogin.status), `admin login failed: ${JSON.stringify(adminLogin.data)}`);
  const adminToken = adminLogin.data.access_token;
  out.admin.login = { status: adminLogin.status, role: adminLogin.data?.user?.role };

  const allHotels = await req('GET', '/admin/hotels', { token: adminToken });
  const pendingList = await req('GET', '/admin/hotels/pending', { token: adminToken });
  const foundPending = Array.isArray(pendingList.data)
    ? pendingList.data.some((h) => h.id === hotelId)
    : false;

  const approve = await req('POST', `/admin/hotels/${hotelId}/approve`, { token: adminToken });
  assert(okStatus(approve.status), `admin approve failed: ${JSON.stringify(approve.data)}`);
  const adminHotelDetail = await req('GET', `/admin/hotels/${hotelId}`, { token: adminToken });
  const invSet = await req('POST', `/admin/rooms/${roomId}/inventory`, {
    token: adminToken,
    body: { date: `${checkIn}T00:00:00.000Z`, total_rooms: 8, blocked_rooms: 1 },
  });
  const invGet = await req(
    'GET',
    `/admin/rooms/${roomId}/inventory?from=${checkIn}T00:00:00.000Z&to=${checkIn}T23:59:59.000Z`,
    { token: adminToken },
  );
  const offline = await req('PATCH', `/admin/hotels/${hotelId}/status`, {
    token: adminToken,
    body: { status: 'OFFLINE' },
  });
  const approvedAgain = await req('PATCH', `/admin/hotels/${hotelId}/status`, {
    token: adminToken,
    body: { status: 'APPROVED' },
  });

  out.admin.allHotels = {
    status: allHotels.status,
    count: Array.isArray(allHotels.data) ? allHotels.data.length : null,
  };
  out.admin.pendingList = {
    status: pendingList.status,
    count: Array.isArray(pendingList.data) ? pendingList.data.length : null,
    includesCreatedHotel: foundPending,
  };
  out.admin.approve = { status: approve.status, hotelStatus: approve.data?.status };
  out.admin.hotelDetail = { status: adminHotelDetail.status, hotelStatus: adminHotelDetail.data?.status };
  out.admin.inventory = {
    setStatus: invSet.status,
    getStatus: invGet.status,
    first: Array.isArray(invGet.data) ? invGet.data[0] : null,
  };
  out.admin.statusToggle = {
    offline: { status: offline.status, hotelStatus: offline.data?.status },
    approved: { status: approvedAgain.status, hotelStatus: approvedAgain.data?.status },
  };

  const userEmail = `userflow_${stamp}@demo.test`;
  const userPassword = 'User12345!';
  const userRegister = await req('POST', '/auth/register', {
    body: { email: userEmail, password: userPassword, role: 'USER' },
  });
  const userLogin = await req('POST', '/auth/login', {
    body: { email: userEmail, password: userPassword },
  });
  assert(okStatus(userLogin.status), `user login failed: ${JSON.stringify(userLogin.data)}`);
  const userToken = userLogin.data.access_token;

  const userMe = await req('GET', '/auth/me', { token: userToken });
  const userForbiddenMerchant = await req('GET', '/merchant/hotels', { token: userToken });
  const hotelList = await req(
    'GET',
    `/hotels?city=${encodeURIComponent('成都')}&keyword=${encodeURIComponent(testTag)}&check_in=${checkIn}&check_out=${checkOut}&rooms_count=1&adults=1&children=0&limit=10`,
  );
  const listItems = hotelList.data?.items || [];
  const foundCreatedHotel = listItems.find((h) => h.id === hotelId);
  const suggestions = await req('GET', `/hotels/suggestions?city=${encodeURIComponent('成都')}&keyword=${encodeURIComponent(testTag)}`);
  const filterMeta = await req('GET', `/hotels/filter-metadata?city=${encodeURIComponent('成都')}`);
  const hotelDetail = await req('GET', `/hotels/${hotelId}?check_in=${checkIn}&check_out=${checkOut}&rooms_count=1`);
  const offers = await req('GET', `/hotels/${hotelId}/offers?check_in=${checkIn}&check_out=${checkOut}&rooms_count=1`);
  const offerItem = (offers.data?.items || []).find((x) => x.is_available) || (offers.data?.items || [])[0];
  assert(offerItem?.room_id, `offers empty: ${JSON.stringify(offers.data)}`);
  const roomPrices = await req(
    'GET',
    `/hotels/rooms/${offerItem.room_id}/prices?from=${checkIn}T00:00:00.000Z&to=${checkOut}T23:59:59.000Z`,
  );
  const roomAvailability = await req(
    'GET',
    `/hotels/rooms/${offerItem.room_id}/availability?check_in=${checkIn}&check_out=${checkOut}&rooms_count=1`,
  );
  const createBooking = await req('POST', '/bookings', {
    body: {
      user_id: userLogin.data.user.id,
      hotel_id: hotelId,
      room_id: offerItem.room_id,
      check_in: checkIn,
      check_out: checkOut,
      rooms_count: 1,
      guest_count: 1,
      contact_name: '联调用户',
      contact_phone: '13800138000',
    },
  });
  assert(okStatus(createBooking.status), `create booking failed: ${JSON.stringify(createBooking.data)}`);
  const bookingId = createBooking.data.id;
  const bookingDetail = await req('GET', `/bookings/${bookingId}`);
  const cancelBooking = await req('PATCH', `/bookings/${bookingId}/cancel`);

  out.user.register = { status: userRegister.status, role: userRegister.data?.role };
  out.user.login = { status: userLogin.status, role: userLogin.data?.user?.role };
  out.user.me = { status: userMe.status, role: userMe.data?.role };
  out.user.forbiddenMerchant = {
    status: userForbiddenMerchant.status,
    message: userForbiddenMerchant.data?.message,
  };
  out.user.discovery = {
    hotelList: { status: hotelList.status, count: listItems.length, foundCreatedHotel: !!foundCreatedHotel },
    suggestions: { status: suggestions.status, total: suggestions.data?.total ?? null },
    filterMetadata: {
      status: filterMeta.status,
      metroCount: filterMeta.data?.nearby_points?.metro?.length ?? null,
      attractionCount: filterMeta.data?.nearby_points?.attraction?.length ?? null,
    },
    hotelDetail: {
      status: hotelDetail.status,
      roomPriceListCount: hotelDetail.data?.room_price_list?.length ?? null,
    },
    offers: {
      status: offers.status,
      count: offers.data?.items?.length ?? null,
      roomId: offerItem.room_id,
      isAvailable: offerItem.is_available,
    },
    roomPrices: { status: roomPrices.status, count: Array.isArray(roomPrices.data) ? roomPrices.data.length : null },
    roomAvailability: {
      status: roomAvailability.status,
      isAvailable: roomAvailability.data?.is_available,
    },
  };
  out.user.booking = {
    create: { status: createBooking.status, id: bookingId, statusValue: createBooking.data?.status },
    detail: { status: bookingDetail.status, statusValue: bookingDetail.data?.status, hotelName: bookingDetail.data?.hotel?.name_cn },
    cancel: { status: cancelBooking.status, statusValue: cancelBooking.data?.status },
  };

  out.crossFlow = {
    hotelId,
    roomId,
    pendingIncludedInAdminList: foundPending,
    approvedStatus: approve.data?.status,
    userFoundHotelInPublicList: !!foundCreatedHotel,
    bookingLifecycle: [createBooking.data?.status, cancelBooking.data?.status],
  };

  return out;
}

async function main() {
  const result = {
    runtime: null,
    contractAudit: null,
    warnings: [],
    checks: { pass: false },
  };

  const strayJs = scanApiSrcCompiledJs();
  if (strayJs.length) {
    result.warnings.push({
      type: 'compiled_js_in_src',
      count: strayJs.length,
      files: strayJs.slice(0, 20),
      message: 'apps/api/src 中存在 .js 文件，可能污染 dist 构建产物',
    });
  }

  result.contractAudit = frontendContractAudit();
  if (result.contractAudit.unmatched.length) {
    result.warnings.push({
      type: 'frontend_unmatched_routes',
      count: result.contractAudit.unmatched.length,
      samples: result.contractAudit.unmatched.slice(0, 10),
      message: '发现前端调用路径未在已知后端路由模式中匹配（可能是动态路径或漏配）',
    });
  }

  result.runtime = await runtimeRoleFlows();
  result.checks.pass = true;
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  const output = {
    checks: { pass: false },
    error: err?.message || String(err),
    stack: err?.stack || null,
  };
  console.error(JSON.stringify(output, null, 2));
  process.exit(1);
});
