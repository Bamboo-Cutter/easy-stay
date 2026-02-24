import Taro from '@tarojs/taro'

const BASE_URL = 'http://localhost:3000'
const TOKEN_KEY = 'easy_stay_user_token'
const USER_KEY = 'easy_stay_user_profile'

function buildUrl(path, query) {
  const url = new URL(path, BASE_URL)
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v))
      }
    })
  }
  return url.toString()
}

export function getToken() {
  try {
    return Taro.getStorageSync(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token) {
  Taro.setStorageSync(TOKEN_KEY, token || '')
}

export function clearToken() {
  Taro.removeStorageSync(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    return Taro.getStorageSync(USER_KEY) || null
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  Taro.setStorageSync(USER_KEY, user || null)
}

export function clearStoredUser() {
  Taro.removeStorageSync(USER_KEY)
}

async function request(method, path, { query, data, auth } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await Taro.request({
    method,
    url: buildUrl(path, query),
    data,
    header: headers,
  })

  if (res.statusCode < 200 || res.statusCode >= 300) {
    const message = res.data?.message
    throw new Error(Array.isArray(message) ? message.join('，') : message || `请求失败: ${res.statusCode}`)
  }
  return res.data
}

export const api = {
  getHotels: (query) => request('GET', '/hotels', { query }),
  getSuggestions: (keyword, city) => request('GET', '/hotels/suggestions', { query: { keyword, city } }),
  getFilterMetadata: (city) => request('GET', '/hotels/filter-metadata', { query: { city } }),
  getHotelDetail: (id, query) => request('GET', `/hotels/${id}`, { query }),
  getHotelOffers: (id, query) => request('GET', `/hotels/${id}/offers`, { query }),
  getHotelCalendar: (id, month) => request('GET', `/hotels/${id}/calendar`, { query: { month } }),
  getHotelRooms:(id) => request('GET', `/hotels/${id}`),
  getRoomAvailability:(id) => request('GET', `/hotels/rooms/${id}/availability`),
  getReviewSummary: (id) => request('GET', `/hotels/${id}/reviews-summary`),
  createBooking: (payload) => request('POST', '/bookings', { data: payload }),
  getBooking: (id) => request('GET', `/bookings/${id}`),
  cancelBooking: (id) => request('PATCH', `/bookings/${id}/cancel`),
  login: (payload) => request('POST', '/auth/login', { data: payload }),
  register: (payload) => request('POST', '/auth/register', { data: payload }),
  me: () => request('GET', '/auth/me', { auth: true }),
  logout: () => request('POST', '/auth/logout', { auth: true }),
}

export const bookingStore = {
  list() {
    try {
      return Taro.getStorageSync('easy_stay_bookings') || []
    } catch {
      return []
    }
  },
  add(booking) {
    const current = this.list()
    const next = [booking, ...current.filter((b) => b?.id !== booking?.id)].slice(0, 20)
    Taro.setStorageSync('easy_stay_bookings', next)
    return next
  },
  replace(booking) {
    const current = this.list()
    const next = current.map((b) => (b?.id === booking?.id ? { ...b, ...booking } : b))
    Taro.setStorageSync('easy_stay_bookings', next)
    return next
  },
}

