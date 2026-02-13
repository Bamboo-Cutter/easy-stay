const API_BASE = localStorage.getItem('easy_stay_api_base') || 'http://localhost:3000';

const app = document.getElementById('app');

const state = {
  loading: false,
  error: '',
  featured: [],
  suggestions: [],
  hotels: null,
  hotelDetail: null,
  reviewSummary: null,
  offers: null,
  bookingResult: null,
  sheet: null,
  searchText: '',
  params: defaultSearchParams(),
  checkoutForm: {
    contact_name: 'GAN RUNQING',
    contact_phone: '0466120541',
    email: 'runqinggan@gmail.com',
  },
};

function defaultSearchParams() {
  const now = new Date();
  const inDate = new Date(now);
  inDate.setDate(now.getDate() + 1);
  const outDate = new Date(now);
  outDate.setDate(now.getDate() + 2);
  return {
    city: 'Sydney',
    keyword: '',
    check_in: toIsoDay(inDate),
    check_out: toIsoDay(outDate),
    rooms_count: 1,
    page: 1,
    limit: 20,
    sort: 'recommended',
    min_price: '',
    max_price: '',
    min_star: '',
    min_rating: '',
    breakfast: false,
    refundable: false,
  };
}

function toIsoDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function isoLabel(isoText) {
  if (!isoText) return '-';
  const d = new Date(isoText);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function buildUrl(path, query) {
  const url = new URL(path, API_BASE);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function apiGet(path, query) {
  const res = await fetch(buildUrl(path, query));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

function setLoading(v) {
  state.loading = v;
  render();
}

function setError(msg) {
  state.error = msg;
  render();
}

function clearError() {
  if (state.error) state.error = '';
}

function currentRoute() {
  const hash = location.hash || '#/home';
  const [pathPart, queryPart] = hash.split('?');
  const path = pathPart.replace(/^#/, '');
  const query = new URLSearchParams(queryPart || '');
  return { path, query };
}

function pushRoute(path, queryObj = {}) {
  const q = new URLSearchParams();
  Object.entries(queryObj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  location.hash = q.toString() ? `${path}?${q.toString()}` : path;
}

async function loadFeatured() {
  setLoading(true);
  try {
    state.featured = await apiGet('/hotels/featured');
    clearError();
  } catch (e) {
    setError(`加载首页推荐失败: ${e.message}`);
  } finally {
    state.loading = false;
    render();
  }
}

function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem('easy_stay_search_history') || '[]');
  } catch {
    return [];
  }
}

function saveSearchHistory(item) {
  const history = getSearchHistory().filter((x) => x !== item);
  history.unshift(item);
  localStorage.setItem('easy_stay_search_history', JSON.stringify(history.slice(0, 8)));
}

async function loadSuggestions(keyword) {
  if (!keyword?.trim()) {
    state.suggestions = [];
    render();
    return;
  }
  try {
    const data = await apiGet('/hotels/suggestions', { keyword });
    state.suggestions = data.items || [];
    clearError();
  } catch (e) {
    state.suggestions = [];
    setError(`获取建议失败: ${e.message}`);
  }
  render();
}

async function loadHotelResults() {
  setLoading(true);
  try {
    const q = {
      city: state.params.city,
      keyword: state.params.keyword,
      check_in: state.params.check_in,
      check_out: state.params.check_out,
      rooms_count: state.params.rooms_count,
      page: state.params.page,
      limit: state.params.limit,
      sort: state.params.sort,
      min_price: state.params.min_price,
      max_price: state.params.max_price,
      min_star: state.params.min_star,
      min_rating: state.params.min_rating,
      breakfast: state.params.breakfast,
      refundable: state.params.refundable,
    };
    state.hotels = await apiGet('/hotels', q);
    clearError();
  } catch (e) {
    setError(`加载酒店列表失败: ${e.message}`);
  } finally {
    state.loading = false;
    render();
  }
}

async function loadHotelDetail(id) {
  setLoading(true);
  try {
    const [detail, summary] = await Promise.all([
      apiGet(`/hotels/${id}`, {
        check_in: state.params.check_in,
        check_out: state.params.check_out,
        rooms_count: state.params.rooms_count,
      }),
      apiGet(`/hotels/${id}/reviews-summary`),
    ]);
    state.hotelDetail = detail;
    state.reviewSummary = summary;
    clearError();
  } catch (e) {
    setError(`加载酒店详情失败: ${e.message}`);
  } finally {
    state.loading = false;
    render();
  }
}

async function loadOffers(hotelId) {
  setLoading(true);
  try {
    state.offers = await apiGet(`/hotels/${hotelId}/offers`, {
      check_in: state.params.check_in,
      check_out: state.params.check_out,
      rooms_count: state.params.rooms_count,
    });
    clearError();
  } catch (e) {
    setError(`加载房型报价失败: ${e.message}`);
  } finally {
    state.loading = false;
    render();
  }
}

async function createBooking(hotelId, roomId) {
  setLoading(true);
  try {
    state.bookingResult = await apiPost('/bookings', {
      hotel_id: hotelId,
      room_id: roomId,
      check_in: state.params.check_in,
      check_out: state.params.check_out,
      rooms_count: state.params.rooms_count,
      guest_count: 1,
      contact_name: state.checkoutForm.contact_name,
      contact_phone: state.checkoutForm.contact_phone,
    });
    clearError();
    alert(`预订成功，订单号: ${state.bookingResult.id}`);
    pushRoute('/results');
  } catch (e) {
    setError(`预订失败: ${e.message}`);
  } finally {
    state.loading = false;
    render();
  }
}

function hotelCard(h) {
  return `
    <article class="hotel-card" data-go="hotel" data-id="${h.id}">
      <img src="${h.hotel_images?.[0]?.url || 'https://picsum.photos/seed/fallback/800/500'}" alt="${h.name_cn}" />
      <div class="hotel-body">
        <div class="hotel-name">${h.name_cn}</div>
        <div class="hotel-sub">${h.name_en || ''}</div>
        <div class="badge-score">
          <span class="score-pill">${(h.review_summary?.rating ?? 0).toFixed(1)}/10</span>
          <strong>${ratingLabel(h.review_summary?.rating ?? 0)}</strong>
          <span class="muted">${h.review_summary?.review_count ?? 0}则评价</span>
        </div>
        <div class="meta-row">
          <span>${h.city} · ${'★'.repeat(h.star)}</span>
          <span class="price">AUD${Math.round((h.min_nightly_price ?? h.rooms?.[0]?.base_price ?? 0) / 100)} <small>/晚起</small></span>
        </div>
      </div>
    </article>
  `;
}

function renderHome() {
  return `
    <div class="app-shell">
      <header class="top-hero">
        <div class="brand-row">
          <div class="brand">Trip<small>.</small>com</div>
          <div class="member">银级会员</div>
        </div>
        <button class="search-box" data-go="search" style="width:100%;border:0">
          <span class="icon-chip">🤖</span>
          <span style="text-align:left;flex:1;font-size:18px;color:#475467">想去边？</span>
          <span class="icon-chip" style="background:#2f55e7;color:#fff">🔍</span>
        </button>
      </header>

      <section class="section section-pad">
        <div class="grid-4">
          ${['住宿', '機票', '機票+酒店', '高鐵/火車'].map((t) => `<div class="tool-item"><div class="icon-chip">🧳</div><strong>${t}</strong></div>`).join('')}
        </div>
        <div class="grid-5" style="margin-top:14px">
          ${['民宿', '门票/体验', '租车', '包团', '+7个'].map((t) => `<div class="tool-item"><div class="icon-chip">•</div><strong>${t}</strong></div>`).join('')}
        </div>
      </section>

      <section class="section section-pad">
        <div class="chips">
          ${['伦敦', '巴黎', '纽约', '东京', '旅游地图'].map((c) => `<span class="chip">${c}</span>`).join('')}
        </div>
      </section>

      <section class="section section-pad">
        <h2 style="margin:0 0 10px;font-size:26px">热门推荐</h2>
        <div class="card-list">
          ${(state.featured || []).map((x) => `
            <article class="hotel-card" data-go="hotel" data-id="${x.id}">
              <img src="${x.cover || 'https://picsum.photos/seed/feature/900/600'}" alt="${x.name_cn}" />
              <div class="hotel-body">
                <div class="hotel-name" style="font-size:24px">${x.name_cn}</div>
                <div class="hotel-sub">${x.name_en || ''}</div>
                <div class="meta-row">
                  <span class="badge-score"><span class="score-pill">${(x.rating ?? 0).toFixed(1)}</span>${ratingLabel(x.rating ?? 0)}</span>
                  <span class="price">AUD${Math.round((x.min_price ?? 0) / 100)} <small>/晚起</small></span>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </section>

      ${renderBottomNav('home')}
      ${renderSystemBlocks()}
    </div>
  `;
}

function renderSearch() {
  const history = getSearchHistory();
  return `
    <div class="app-shell">
      <div class="top-bar">
        <button class="back-btn" data-go="back">←</button>
        <div class="input-bar" style="flex:1">
          <span class="icon-chip">🤖</span>
          <input id="searchInput" placeholder="目的地、景点、酒店等" value="${escapeHtml(state.searchText)}" />
        </div>
        <button class="cta ghost" data-action="do-search" style="padding:7px 12px">搜寻</button>
      </div>

      <section class="section section-pad">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h2 style="margin:0;font-size:24px">最近搜寻纪录</h2>
          <button class="cta ghost" data-action="clear-history" style="padding:6px 10px">清除</button>
        </div>
        <div class="chips" style="margin-top:10px">
          ${history.map((x) => `<button class="chip" data-action="pick-history" data-value="${escapeHtml(x)}">${x}</button>`).join('') || '<span class="muted">暂无</span>'}
        </div>
      </section>

      <section class="section section-pad">
        <h3 style="margin:0 0 10px">智慧建议</h3>
        <div class="card-list">
          ${(state.suggestions || []).map((s) => `<button class="list-option" data-action="pick-suggestion" data-value="${escapeHtml(s.city || '')}" style="padding:12px">${s.label}</button>`).join('') || '<div class="muted">输入关键词后显示建议</div>'}
        </div>
      </section>

      ${renderSystemBlocks()}
    </div>
  `;
}

function renderResults() {
  const list = state.hotels?.items || [];
  return `
    <div class="app-shell">
      <header class="result-top">
        <div class="query-card">
          <div style="font-size:18px;font-weight:700">${isoLabel(state.params.check_in)}<br/>${isoLabel(state.params.check_out)}</div>
          <div class="muted" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${state.params.city || state.params.keyword || '目的地'}</div>
          <button class="icon-btn" data-go="search">🔎</button>
        </div>
        <div class="filter-row">
          <button class="filter-btn" data-action="open-sort">排序</button>
          <button class="filter-btn" data-action="open-filter">筛选</button>
          <button class="filter-btn" data-action="open-location">位置</button>
          <button class="filter-btn" data-action="open-price">价格</button>
        </div>
      </header>

      <div class="map-box">
        <div class="map-pin" style="left:55%;top:28%">🏨</div>
        <div class="map-pin" style="left:63%;top:52%">🏨</div>
        <div class="map-pin" style="left:46%;top:63%">🏨</div>
        <button class="cta" style="position:absolute;right:10px;bottom:10px;padding:8px 12px;font-size:14px">地图</button>
      </div>

      <section class="section section-pad">
        <h2 style="margin:0 0 10px">找到${state.hotels?.total ?? 0}间住宿</h2>
        <div class="card-list">${list.map(hotelCard).join('')}</div>
      </section>

      ${renderSheet()}
      ${renderSystemBlocks()}
    </div>
  `;
}

function renderHotelDetail(id) {
  const h = state.hotelDetail;
  if (!h) return `<div class="app-shell">${renderSystemBlocks()}</div>`;
  const cover = h.hotel_images?.[0]?.url || 'https://picsum.photos/seed/detail/1000/700';
  return `
    <div class="app-shell" style="padding-bottom:120px">
      <div class="hotel-hero">
        <img src="${cover}" alt="cover" />
        <div class="hero-actions">
          <button class="icon-btn" data-go="results">←</button>
          <div style="display:flex;gap:8px">
            <button class="dark-fab icon-btn">♡</button>
            <button class="dark-fab icon-btn">↗</button>
          </div>
        </div>
      </div>

      <section class="section section-pad" style="margin-top:-16px;position:relative;z-index:2">
        <div class="hotel-name">${h.name_cn}</div>
        <div class="hotel-sub" style="font-size:18px">${h.name_en || ''}</div>
        <div class="hotel-sub" style="margin-top:8px">${h.address}，${h.city}</div>
        <div class="badge-score">
          <span class="score-pill">${(state.reviewSummary?.rating ?? h.review_summary?.rating ?? 0).toFixed(1)}/10</span>
          <strong>${state.reviewSummary?.grade || ratingLabel(h.review_summary?.rating ?? 0)}</strong>
          <span class="muted">${state.reviewSummary?.review_count || h.review_summary?.review_count || 0}则评价</span>
        </div>
      </section>

      <section class="section section-pad">
        <h3 style="margin:0 0 10px;font-size:38px">热门设施</h3>
        <div class="two-col" style="font-size:17px;line-height:1.9">
          ${(h.hotel_tags || []).slice(0, 6).map((t) => `<div>✓ ${t.tag}</div>`).join('') || '<div>✓ 免费Wi-Fi</div><div>✓ 行李寄存</div>'}
        </div>
      </section>

      <section class="section section-pad">
        <h3 style="margin:0 0 8px;font-size:34px">真实评价</h3>
        <div class="two-col">
          <div>
            <div style="color:#1d4ed8;font-size:42px;font-weight:800">${(state.reviewSummary?.rating ?? 0).toFixed(1)}</div>
            <div class="muted">${state.reviewSummary?.grade || '很好'}</div>
          </div>
          <div style="font-size:14px;line-height:1.8">
            <div>卫生 ${state.reviewSummary?.dimensions?.cleanliness ?? '-'}</div>
            <div>服务 ${state.reviewSummary?.dimensions?.service ?? '-'}</div>
            <div>设施 ${state.reviewSummary?.dimensions?.facilities ?? '-'}</div>
            <div>位置 ${state.reviewSummary?.dimensions?.location ?? '-'}</div>
          </div>
        </div>
        <div class="muted" style="margin-top:10px">${state.reviewSummary?.ai_summary || ''}</div>
      </section>

      <section class="section section-pad">
        <h3 style="margin:0 0 8px;font-size:34px">行程选择</h3>
        <div class="query-card" style="border:1px solid #e4e7ec">
          <div>
            <div>${isoLabel(state.params.check_in)} - ${isoLabel(state.params.check_out)}</div>
            <div class="muted">${state.params.rooms_count}间房</div>
          </div>
          <button class="cta ghost" data-action="open-calendar">选日期</button>
        </div>
        <button class="full-btn" style="margin-top:12px" data-go="rooms" data-id="${id}">选择您的房间</button>
      </section>

      ${renderSheet()}
      ${renderSystemBlocks()}
    </div>
  `;
}

function renderRooms(hotelId) {
  const offers = state.offers?.items || [];
  const h = state.hotelDetail;
  return `
    <div class="app-shell" style="padding-bottom:112px">
      <div class="top-bar">
        <button class="back-btn" data-go="hotel" data-id="${hotelId}">←</button>
        <div style="flex:1;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h?.name_cn || '选择房型'}</div>
        <button class="icon-btn">♡</button>
      </div>

      <section class="section section-pad">
        <div class="query-card" style="border:1px solid #e4e7ec">
          <div>
            <div>${isoLabel(state.params.check_in)} - ${isoLabel(state.params.check_out)}</div>
            <div class="muted">${state.params.rooms_count}间 · 1位成人</div>
          </div>
          <button class="cta ghost" data-action="open-calendar">日期</button>
        </div>
      </section>

      <section class="section section-pad">
        <h2 style="margin:0 0 10px">房型报价</h2>
        <div class="card-list">
          ${offers.map((o) => `
            <article class="room-card">
              <img src="${h?.hotel_images?.[1]?.url || h?.hotel_images?.[0]?.url || 'https://picsum.photos/seed/room/800/520'}" alt="room" />
              <div class="room-body">
                <div style="font-size:30px;font-weight:700">${o.room_name}</div>
                <div class="muted">最多${o.max_occupancy}人 · ${o.breakfast ? '含早餐' : '不含早餐'} · ${o.refundable ? '可退' : '不可退'}</div>
                <div class="room-price-row">
                  <div>
                    <div class="muted">总价（${o.nights}晚）</div>
                    <div class="price">AUD${Math.round(o.total_price / 100)}</div>
                    <div class="muted">可订: ${o.available_rooms}</div>
                  </div>
                  <button class="cta" data-action="checkout" data-hotel="${hotelId}" data-room="${o.room_id}" ${o.is_available ? '' : 'disabled'}>${o.is_available ? '预订' : '售罄'}</button>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </section>

      ${renderSheet()}
      ${renderSystemBlocks()}
    </div>
  `;
}

function renderCheckout(hotelId, roomId) {
  const offer = state.offers?.items?.find((x) => x.room_id === roomId);
  const h = state.hotelDetail;
  const total = offer?.total_price ?? 0;
  return `
    <div class="app-shell" style="padding-bottom:110px">
      <header class="checkout-top">
        <div style="display:flex;align-items:center;gap:10px">
          <button class="dark-fab icon-btn" data-go="rooms" data-id="${hotelId}">←</button>
          <div style="font-size:34px;font-weight:800">${h?.name_cn || '提交订单'}</div>
        </div>
      </header>

      <section class="section section-pad">
        <h3 style="margin:0 0 8px">入住信息</h3>
        <div>${isoLabel(state.params.check_in)} - ${isoLabel(state.params.check_out)} (${offer?.nights || 1}晚)</div>
        <div class="muted" style="margin-top:4px">${offer?.room_name || ''}</div>
      </section>

      <div class="notice">房间非常受欢迎！立即完成预订，确保可以入住心水房间。</div>

      <section class="form-card">
        <h3>住客资料</h3>
        <div class="form-grid">
          <div class="two-col">
            <div>
              <div class="label">姓与名</div>
              <input class="ctrl" id="contact_name" value="${escapeHtml(state.checkoutForm.contact_name)}" />
            </div>
            <div>
              <div class="label">手机</div>
              <input class="ctrl" id="contact_phone" value="${escapeHtml(state.checkoutForm.contact_phone)}" />
            </div>
          </div>
          <div>
            <div class="label">电子邮件</div>
            <input class="ctrl" id="contact_email" value="${escapeHtml(state.checkoutForm.email)}" />
          </div>
        </div>
      </section>

      <section class="form-card">
        <h3>特别要求（选填）</h3>
        <div class="form-grid">
          <label class="checkline"><input type="checkbox" /> 安静房间</label>
          <label class="checkline"><input type="checkbox" /> 需要无烟处理</label>
          <label class="checkline"><input type="checkbox" /> 高楼层</label>
        </div>
      </section>

      <div class="fixed-price-bar">
        <div class="fixed-price-inner">
          <div>
            <div class="muted">网上预付</div>
            <div class="price-big">AUD${(total / 100).toFixed(2)}</div>
          </div>
          <button class="cta" data-action="submit-booking" data-hotel="${hotelId}" data-room="${roomId}">预订</button>
        </div>
      </div>

      ${renderSystemBlocks()}
    </div>
  `;
}

function renderBottomNav(active) {
  const nav = [
    ['home', '主页', '⌂'],
    ['search', '搜寻', '⌕'],
    ['publish', '发布', '+'],
    ['trips', '行程', '▣'],
    ['account', '帐户', '◉'],
  ];

  return `
    <div class="bottom-nav">
      <nav class="bottom-nav-inner">
        ${nav
          .map(([key, label, icon]) => {
            if (key === 'publish') {
              return `<div class="nav-item"><div class="floating-add">+</div><div>${label}</div></div>`;
            }
            const route = key === 'home' ? '/home' : key === 'search' ? '/search' : '/home';
            return `<button class="nav-item ${active === key ? 'active' : ''}" data-go-route="${route}" style="border:0;background:transparent"><div>${icon}</div><div>${label}</div></button>`;
          })
          .join('')}
      </nav>
    </div>
  `;
}

function renderSheet() {
  if (!state.sheet) return '';

  if (state.sheet === 'sort') {
    const options = [
      ['recommended', 'Trip.com 推荐'],
      ['price_asc', '最低价格（连税后）'],
      ['price_desc', '最高价格（连税后）'],
      ['rating_desc', '热门评价'],
      ['star_desc', '星级（由高至低）'],
      ['newest', '最新上架'],
    ];
    return `
      <div class="sheet-mask show" data-action="close-sheet">
        <div class="sheet" onclick="event.stopPropagation()">
          <div class="sheet-head"><button class="icon-btn" data-action="close-sheet">✕</button><span>排序</span><span></span></div>
          ${options
            .map(
              ([v, t]) => `<button class="list-option ${state.params.sort === v ? 'active' : ''}" data-action="set-sort" data-value="${v}">${t}</button>`,
            )
            .join('')}
        </div>
      </div>
    `;
  }

  if (state.sheet === 'filter' || state.sheet === 'price') {
    return `
      <div class="sheet-mask show" data-action="close-sheet">
        <div class="sheet" onclick="event.stopPropagation()">
          <div class="sheet-head"><button class="icon-btn" data-action="close-sheet">✕</button><span>筛选</span><button class="cta ghost" data-action="reset-filter" style="padding:6px 10px">重设</button></div>
          <div class="form-grid">
            <div class="two-col">
              <div><div class="label">最低价（分）</div><input id="f_min_price" class="ctrl" value="${state.params.min_price}" /></div>
              <div><div class="label">最高价（分）</div><input id="f_max_price" class="ctrl" value="${state.params.max_price}" /></div>
            </div>
            <div class="two-col">
              <div><div class="label">最低星级</div><select id="f_star" class="ctrl"><option value="">不限</option>${[1,2,3,4,5].map(x=>`<option value="${x}" ${String(state.params.min_star)===String(x)?'selected':''}>${x}星+</option>`).join('')}</select></div>
              <div><div class="label">最低评分</div><select id="f_rating" class="ctrl"><option value="">不限</option>${[6,7,8,9].map(x=>`<option value="${x}" ${String(state.params.min_rating)===String(x)?'selected':''}>${x}+</option>`).join('')}</select></div>
            </div>
            <label class="checkline"><input type="checkbox" id="f_breakfast" ${state.params.breakfast ? 'checked' : ''}/> 包含早餐</label>
            <label class="checkline"><input type="checkbox" id="f_refundable" ${state.params.refundable ? 'checked' : ''}/> 免费取消/可退款</label>
            <button class="full-btn" data-action="apply-filter">显示结果</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.sheet === 'location') {
    return `
      <div class="sheet-mask show" data-action="close-sheet">
        <div class="sheet" onclick="event.stopPropagation()">
          <div class="sheet-head"><button class="icon-btn" data-action="close-sheet">✕</button><span>酒店位置</span><button class="cta ghost" data-action="close-sheet" style="padding:6px 10px">完成</button></div>
          <div class="form-grid">
            <div class="label">城市</div>
            <input id="f_city" class="ctrl" value="${escapeHtml(state.params.city || '')}" />
            <button class="full-btn" data-action="apply-location">显示结果</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.sheet === 'calendar') {
    return `
      <div class="sheet-mask show" data-action="close-sheet">
        <div class="sheet" onclick="event.stopPropagation()">
          <div class="sheet-head"><button class="icon-btn" data-action="close-sheet">✕</button><span>选择日期</span><span></span></div>
          <div class="form-grid">
            <div><div class="label">入住日期</div><input type="date" id="f_check_in" class="ctrl" value="${new Date(state.params.check_in).toISOString().slice(0, 10)}" /></div>
            <div><div class="label">退房日期</div><input type="date" id="f_check_out" class="ctrl" value="${new Date(state.params.check_out).toISOString().slice(0, 10)}" /></div>
            <div><div class="label">房间数</div><input type="number" id="f_rooms_count" class="ctrl" min="1" value="${state.params.rooms_count}" /></div>
            <button class="full-btn" data-action="apply-calendar">确认</button>
          </div>
        </div>
      </div>
    `;
  }

  return '';
}

function renderSystemBlocks() {
  const parts = [];
  if (state.loading) parts.push('<div class="loading">加载中...</div>');
  if (state.error) parts.push(`<div class="error">${escapeHtml(state.error)}</div>`);
  return parts.join('');
}

function escapeHtml(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function ratingLabel(rating) {
  if (rating >= 9) return '非常好';
  if (rating >= 8) return '很好';
  if (rating >= 7) return '好';
  if (rating >= 6) return '愉快';
  return '一般';
}

function render() {
  const { path } = currentRoute();
  if (path === '/home') app.innerHTML = renderHome();
  else if (path === '/search') app.innerHTML = renderSearch();
  else if (path === '/results') app.innerHTML = renderResults();
  else if (path.startsWith('/hotel/')) app.innerHTML = renderHotelDetail(path.split('/')[2]);
  else if (path.startsWith('/rooms/')) app.innerHTML = renderRooms(path.split('/')[2]);
  else if (path.startsWith('/checkout/')) {
    const [, , hotelId, roomId] = path.split('/');
    app.innerHTML = renderCheckout(hotelId, roomId);
  } else pushRoute('/home');
}

async function routeChanged() {
  const { path, query } = currentRoute();

  if (path === '/home' && !state.featured.length) {
    await loadFeatured();
    return;
  }

  if (path === '/search') {
    state.searchText = query.get('q') || state.searchText || '';
    if (state.searchText) loadSuggestions(state.searchText);
    render();
    return;
  }

  if (path === '/results') {
    const merge = { ...state.params };
    ['city', 'keyword', 'check_in', 'check_out', 'rooms_count'].forEach((k) => {
      const v = query.get(k);
      if (v !== null) merge[k] = k === 'rooms_count' ? Number(v || 1) : v;
    });
    state.params = merge;
    await loadHotelResults();
    return;
  }

  if (path.startsWith('/hotel/')) {
    const id = path.split('/')[2];
    if (!state.hotelDetail || state.hotelDetail.id !== id) await loadHotelDetail(id);
    else render();
    return;
  }

  if (path.startsWith('/rooms/')) {
    const id = path.split('/')[2];
    if (!state.hotelDetail || state.hotelDetail.id !== id) await loadHotelDetail(id);
    await loadOffers(id);
    return;
  }

  if (path.startsWith('/checkout/')) {
    const hotelId = path.split('/')[2];
    if (!state.hotelDetail || state.hotelDetail.id !== hotelId) await loadHotelDetail(hotelId);
    if (!state.offers) await loadOffers(hotelId);
    render();
    return;
  }

  render();
}

window.addEventListener('hashchange', routeChanged);

app.addEventListener('input', (e) => {
  if (e.target.id === 'searchInput') {
    state.searchText = e.target.value;
    loadSuggestions(state.searchText);
  }
});

app.addEventListener('click', async (e) => {
  const goRoute = e.target.closest('[data-go-route]')?.dataset.goRoute;
  if (goRoute) {
    pushRoute(goRoute);
    return;
  }

  const go = e.target.closest('[data-go]');
  if (go) {
    const type = go.dataset.go;
    const id = go.dataset.id;
    if (type === 'search') pushRoute('/search');
    else if (type === 'results') pushRoute('/results');
    else if (type === 'back') history.back();
    else if (type === 'hotel') pushRoute(`/hotel/${id}`);
    else if (type === 'rooms') pushRoute(`/rooms/${id}`);
    return;
  }

  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;

  if (action === 'do-search') {
    const text = (document.getElementById('searchInput')?.value || '').trim();
    state.searchText = text;
    if (text) saveSearchHistory(text);
    state.params.keyword = text;
    state.params.city = text;
    pushRoute('/results', {
      city: text,
      keyword: text,
      check_in: state.params.check_in,
      check_out: state.params.check_out,
      rooms_count: state.params.rooms_count,
    });
    return;
  }

  if (action === 'pick-history' || action === 'pick-suggestion') {
    const v = e.target.dataset.value || '';
    state.searchText = v;
    state.params.city = v;
    state.params.keyword = v;
    saveSearchHistory(v);
    pushRoute('/results', {
      city: v,
      keyword: v,
      check_in: state.params.check_in,
      check_out: state.params.check_out,
      rooms_count: state.params.rooms_count,
    });
    return;
  }

  if (action === 'clear-history') {
    localStorage.removeItem('easy_stay_search_history');
    render();
    return;
  }

  if (action === 'open-sort') state.sheet = 'sort';
  if (action === 'open-filter') state.sheet = 'filter';
  if (action === 'open-location') state.sheet = 'location';
  if (action === 'open-price') state.sheet = 'price';
  if (action === 'open-calendar') state.sheet = 'calendar';
  if (['open-sort', 'open-filter', 'open-location', 'open-price', 'open-calendar'].includes(action)) {
    render();
    return;
  }

  if (action === 'close-sheet') {
    state.sheet = null;
    render();
    return;
  }

  if (action === 'set-sort') {
    state.params.sort = e.target.dataset.value;
    state.sheet = null;
    await loadHotelResults();
    return;
  }

  if (action === 'reset-filter') {
    state.params.min_price = '';
    state.params.max_price = '';
    state.params.min_star = '';
    state.params.min_rating = '';
    state.params.breakfast = false;
    state.params.refundable = false;
    render();
    return;
  }

  if (action === 'apply-filter') {
    state.params.min_price = document.getElementById('f_min_price')?.value || '';
    state.params.max_price = document.getElementById('f_max_price')?.value || '';
    state.params.min_star = document.getElementById('f_star')?.value || '';
    state.params.min_rating = document.getElementById('f_rating')?.value || '';
    state.params.breakfast = !!document.getElementById('f_breakfast')?.checked;
    state.params.refundable = !!document.getElementById('f_refundable')?.checked;
    state.sheet = null;
    await loadHotelResults();
    return;
  }

  if (action === 'apply-location') {
    state.params.city = document.getElementById('f_city')?.value || state.params.city;
    state.sheet = null;
    await loadHotelResults();
    return;
  }

  if (action === 'apply-calendar') {
    const checkIn = document.getElementById('f_check_in')?.value;
    const checkOut = document.getElementById('f_check_out')?.value;
    const roomsCount = Number(document.getElementById('f_rooms_count')?.value || 1);
    if (checkIn) state.params.check_in = toIsoDay(checkIn);
    if (checkOut) state.params.check_out = toIsoDay(checkOut);
    state.params.rooms_count = Math.max(1, roomsCount);
    state.sheet = null;

    const { path } = currentRoute();
    if (path === '/results') await loadHotelResults();
    else if (path.startsWith('/hotel/')) await loadHotelDetail(path.split('/')[2]);
    else if (path.startsWith('/rooms/')) await loadOffers(path.split('/')[2]);
    else render();
    return;
  }

  if (action === 'checkout') {
    const hotelId = e.target.dataset.hotel;
    const roomId = e.target.dataset.room;
    pushRoute(`/checkout/${hotelId}/${roomId}`);
    return;
  }

  if (action === 'submit-booking') {
    state.checkoutForm.contact_name = document.getElementById('contact_name')?.value || state.checkoutForm.contact_name;
    state.checkoutForm.contact_phone = document.getElementById('contact_phone')?.value || state.checkoutForm.contact_phone;
    state.checkoutForm.email = document.getElementById('contact_email')?.value || state.checkoutForm.email;
    await createBooking(e.target.dataset.hotel, e.target.dataset.room);
    return;
  }
});

routeChanged();
