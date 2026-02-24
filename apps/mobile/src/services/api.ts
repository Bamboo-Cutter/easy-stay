import Taro from '@tarojs/taro';

const BASE_URL = typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:3000';

function buildUrl(path, query) {
  const url = new URL(path, BASE_URL);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });
  }
  return url.toString();
}

async function get(path, query) {
  const res = await Taro.request({
    method: 'GET',
    url: buildUrl(path, query),
  });
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`请求失败: ${res.statusCode}`);
  }
  return res.data;
}

async function post(path, data) {
  const res = await Taro.request({
    method: 'POST',
    url: buildUrl(path),
    data,
    header: {
      'Content-Type': 'application/json',
    },
  });
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`请求失败: ${res.statusCode}`);
  }
  return res.data;
}

export const api = {
  getFeatured: () => get('/hotels/featured'),
  getBanners: () => get('/hotels/banners'),
  getSuggestions: (keyword) => get('/hotels/suggestions', { keyword }),
  getHotels: (query) => get('/hotels', query),
  getFilterMetadata: (city) => get('/hotels/filter-metadata', { city }),
  getHotelDetail: (id, query) => get(`/hotels/${id}`, query),
  getHotelOffers: (id, query) => get(`/hotels/${id}/offers`, query),
  getHotelCalendar: (id, month) => get(`/hotels/${id}/calendar`, { month }),
  getReviewSummary: (id) => get(`/hotels/${id}/reviews-summary`),
  createBooking: (payload) => post('/bookings', payload),
};
