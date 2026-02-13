import Taro from '@tarojs/taro';
import type {
  FilterMetadata,
  HomeBanner,
  HotelCalendarResponse,
  HotelListQuery,
  HotelListResponse,
  HotelOffersResponse,
  ReviewSummary,
} from '../types/hotel';

const BASE_URL = (typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:3000') as string;

function buildUrl(path: string, query?: Record<string, unknown>) {
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

async function get<T>(path: string, query?: Record<string, unknown>) {
  const res = await Taro.request<T>({
    method: 'GET',
    url: buildUrl(path, query),
  });
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`请求失败: ${res.statusCode}`);
  }
  return res.data;
}

async function post<T>(path: string, data: Record<string, unknown>) {
  const res = await Taro.request<T>({
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
  getFeatured: () => get<Array<{ id: string; name_cn: string; city: string; cover: string | null; rating: number | null; min_price: number | null }>>('/hotels/featured'),
  getBanners: () => get<HomeBanner[]>('/hotels/banners'),
  getSuggestions: (keyword: string) => get<{ items: Array<{ id: string; city: string; label: string }> }>('/hotels/suggestions', { keyword }),
  getHotels: (query: HotelListQuery) => get<HotelListResponse>('/hotels', query),
  getFilterMetadata: (city?: string) => get<FilterMetadata>('/hotels/filter-metadata', { city }),
  getHotelDetail: (id: string, query: { check_in?: string; check_out?: string; rooms_count?: number }) => get(`/hotels/${id}`, query),
  getHotelOffers: (id: string, query: { check_in: string; check_out: string; rooms_count: number }) => get<HotelOffersResponse>(`/hotels/${id}/offers`, query),
  getHotelCalendar: (id: string, month: string) => get<HotelCalendarResponse>(`/hotels/${id}/calendar`, { month }),
  getReviewSummary: (id: string) => get<ReviewSummary>(`/hotels/${id}/reviews-summary`),
  createBooking: (payload: {
    hotel_id: string;
    room_id: string;
    check_in: string;
    check_out: string;
    rooms_count: number;
    guest_count: number;
    contact_name: string;
    contact_phone: string;
  }) => post<{ id: string }>('/bookings', payload),
};
