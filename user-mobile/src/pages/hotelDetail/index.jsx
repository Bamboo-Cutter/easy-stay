import { useEffect, useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Swiper, SwiperItem, Image, ScrollView, Button } from '@tarojs/components'
import dayjs from 'dayjs'
import { api } from '../../utils/api'
import './index.css'

function nextDay(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function decodeParam(v) {
  if (!v) return ''
  try {
    return decodeURIComponent(String(v))
  } catch {
    return String(v)
  }
}

function normalizeDateParam(v, fallback) {
  const raw = decodeParam(v)
  if (!raw) return fallback
  const d = dayjs(raw)
  if (!d.isValid()) return fallback
  return d.startOf('day').toISOString()
}

function ensureFutureStay(checkInIso, checkOutIso) {
  const today = dayjs().startOf('day')
  let inDay = dayjs(checkInIso)
  let outDay = dayjs(checkOutIso)
  if (!inDay.isValid() || inDay.isBefore(today, 'day')) inDay = today
  if (!outDay.isValid() || !outDay.isAfter(inDay, 'day')) outDay = inDay.add(1, 'day')
  return {
    checkIn: inDay.startOf('day').toISOString(),
    checkOut: outDay.startOf('day').toISOString(),
  }
}

function toMonthKey(iso) {
  return dayjs(iso).format('YYYY-MM')
}

function monthGrid(monthKey) {
  const start = dayjs(`${monthKey}-01`)
  const daysInMonth = start.daysInMonth()
  const offset = start.day()
  const cells = []
  for (let i = 0; i < offset; i += 1) cells.push(null)
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(start.date(d).format('YYYY-MM-DD'))
  }
  return cells
}

function monthTitle(monthKey) {
  return dayjs(`${monthKey}-01`).format('YYYY年M月')
}

function prevMonth(monthKey) {
  return dayjs(`${monthKey}-01`).subtract(1, 'month').format('YYYY-MM')
}

function nextMonthKey(monthKey) {
  return dayjs(`${monthKey}-01`).add(1, 'month').format('YYYY-MM')
}

export default function HotelDetailPage() {
  const router = Taro.getCurrentInstance().router
  const params = router?.params || {}
  const hotelId = params.id || ''
  const todayIso = dayjs().startOf('day').toISOString()
  const normalizedInitial = ensureFutureStay(
    normalizeDateParam(params.check_in, todayIso),
    normalizeDateParam(params.check_out, nextDay(todayIso)),
  )
  const initialCheckIn = normalizedInitial.checkIn
  const initialCheckOut = normalizedInitial.checkOut
  const initialAdults = Math.max(1, Number(decodeParam(params.adults || 1)) || 1)
  const [checkIn, setCheckIn] = useState(initialCheckIn)
  const [checkOut, setCheckOut] = useState(initialCheckOut)
  const [roomsCount, setRoomsCount] = useState(Math.max(1, Number(params.rooms_count || 1)))
  const [detail, setDetail] = useState(null)
  const [summary, setSummary] = useState(null)
  const [calendar, setCalendar] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showCalendarSheet, setShowCalendarSheet] = useState(false)
  const [sheetMonth, setSheetMonth] = useState(dayjs(initialCheckIn).format('YYYY-MM'))
  const [sheetCalendar, setSheetCalendar] = useState(null)
  const [sheetCalendarLoading, setSheetCalendarLoading] = useState(false)
  const [tempCheckIn, setTempCheckIn] = useState(dayjs(initialCheckIn).format('YYYY-MM-DD'))
  const [tempCheckOut, setTempCheckOut] = useState(dayjs(initialCheckOut).format('YYYY-MM-DD'))
  const [adultCount] = useState(initialAdults)

  useEffect(() => {
    if (!hotelId) return
    setLoading(true)
    Promise.all([
      api.getHotelDetail(hotelId, { check_in: checkIn, check_out: checkOut, rooms_count: roomsCount }),
      api.getReviewSummary(hotelId),
      api.getHotelCalendar(hotelId, dayjs(checkIn).format('YYYY-MM')),
    ])
      .then(([d, s, c]) => {
        setDetail(d)
        setSummary(s)
        setCalendar(c)
      })
      .catch((err) => Taro.showToast({ title: err.message || '加载失败', icon: 'none' }))
      .finally(() => setLoading(false))
  }, [hotelId, checkIn, checkOut, roomsCount])

  useEffect(() => {
    if (!showCalendarSheet || !hotelId || !sheetMonth) return
    setSheetCalendarLoading(true)
    api.getHotelCalendar(hotelId, sheetMonth)
      .then(setSheetCalendar)
      .catch((err) => Taro.showToast({ title: err.message || '日历加载失败', icon: 'none' }))
      .finally(() => setSheetCalendarLoading(false))
  }, [showCalendarSheet, hotelId, sheetMonth])

  const images = useMemo(
    () => (detail?.hotel_images?.length ? detail.hotel_images : [{ url: 'https://picsum.photos/seed/hotel-detail-fallback/1200/800' }]),
    [detail],
  )

  const rating = Number(summary?.rating ?? detail?.review_summary?.rating ?? 0).toFixed(1)
  const reviewCount = summary?.review_count ?? detail?.review_summary?.review_count ?? 0
  const nights = Math.max(dayjs(checkOut).diff(dayjs(checkIn), 'day'), 1)
  const todayDateKey = dayjs().startOf('day').format('YYYY-MM-DD')
  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六']
  const calendarPriceMap = useMemo(() => {
    const m = new Map()
    ;(sheetCalendar?.days || []).forEach((d) => m.set(d.date, d))
    return m
  }, [sheetCalendar])
  const gridCells = useMemo(() => monthGrid(sheetMonth), [sheetMonth])

  const openCalendarSheet = () => {
    setTempCheckIn(dayjs(checkIn).format('YYYY-MM-DD'))
    setTempCheckOut(dayjs(checkOut).format('YYYY-MM-DD'))
    setSheetMonth(toMonthKey(checkIn))
    setShowCalendarSheet(true)
  }

  const onPickDate = (dateStr) => {
    if (!dateStr) return
    const noStartOrRangeDone = !tempCheckIn || (tempCheckIn && tempCheckOut)
    if (noStartOrRangeDone) {
      setTempCheckIn(dateStr)
      setTempCheckOut('')
      return
    }
    if (dayjs(dateStr).isAfter(dayjs(tempCheckIn), 'day')) {
      setTempCheckOut(dateStr)
      return
    }
    setTempCheckIn(dateStr)
    setTempCheckOut('')
  }

  const confirmCalendar = () => {
    if (!tempCheckIn || !tempCheckOut) {
      Taro.showToast({ title: '请选择入住和离店日期', icon: 'none' })
      return
    }
    setCheckIn(`${tempCheckIn}T00:00:00.000Z`)
    setCheckOut(`${tempCheckOut}T00:00:00.000Z`)
    setShowCalendarSheet(false)
  }

  return (
    <View className='detail-page'>
      <View className='detail-hero'>
        <Swiper circular autoplay className='detail-swiper'>
          {images.map((img, idx) => (
            <SwiperItem key={idx}>
              <Image className='detail-hero-img' src={img.url} mode='aspectFill' />
            </SwiperItem>
          ))}
        </Swiper>
        <View className='detail-nav'>
          <View className='circle-btn' onClick={() => Taro.navigateBack()}>←</View>
          <View className='circle-btn' onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}>我</View>
        </View>
      </View>

      <ScrollView scrollY className='detail-scroll'>
        <View className='detail-card'>
          <Text className='detail-title'>{detail?.name_cn || '加载中...'}</Text>
          <Text className='detail-sub'>{detail?.name_en || ''}</Text>
          <Text className='detail-sub'>{detail?.address || ''}</Text>
          <View className='detail-score-row'>
            <Text className='score-pill'>{rating}分</Text>
            <Text className='detail-sub'>{summary?.grade || '综合评分'}</Text>
            <Text className='detail-sub'>{reviewCount}条点评</Text>
          </View>
          <View className='detail-mini-row'>
            <Text>{detail?.city || ''}</Text>
            <Text>{detail?.star ? `${detail.star}星` : ''}</Text>
            <Text>{detail?.type || ''}</Text>
          </View>
        </View>

        <View className='detail-card'>
          <Text className='section-title'>入住信息</Text>
          <View className='booking-strip clickable' onClick={openCalendarSheet}>
            <View className='strip-main'>
              <Text>{dayjs(checkIn).format('MM/DD')} - {dayjs(checkOut).format('MM/DD')} · {nights}晚</Text>
              <Text className='strip-sub'>点此查看价格日历（按当前{roomsCount}间房估算）</Text>
            </View>
            <Text>{roomsCount}间房 ›</Text>
          </View>
          {!!calendar?.days?.length && (
            <View className='calendar-chip-row'>
              {calendar.days
                .filter((d) => d?.is_available && d?.min_price !== null && !dayjs(d.date).isBefore(dayjs(todayDateKey), 'day'))
                .slice(0, 6)
                .map((d) => (
                  <View
                    key={d.date}
                    className='calendar-chip'
                    onClick={() => {
                      if (dayjs(d.date).isBefore(dayjs(todayDateKey), 'day')) return
                      const inIso = `${d.date}T00:00:00.000Z`
                      setCheckIn(inIso)
                      setCheckOut(nextDay(inIso))
                    }}
                  >
                    <Text>{d.date.slice(5)}</Text>
                    <Text className='chip-price'>¥{Math.round(((d.min_price || 0) * roomsCount) / 100)}</Text>
                  </View>
                ))}
            </View>
          )}
          <View className='counter-row'>
            <Text>房间数量</Text>
            <View className='counter-actions'>
              <View className='counter-btn' onClick={() => setRoomsCount(v => Math.max(1, v - 1))}>-</View>
              <Text>{roomsCount}</Text>
              <View className='counter-btn' onClick={() => setRoomsCount(v => Math.min(6, v + 1))}>+</View>
            </View>
          </View>
          <Button
            className='primary-btn'
            onClick={() =>
              Taro.navigateTo({
                url: `/pages/roomOffers/index?hotelId=${hotelId}&check_in=${encodeURIComponent(checkIn)}&check_out=${encodeURIComponent(checkOut)}&rooms_count=${roomsCount}&adults=${adultCount}`,
              })
            }
          >
            查看房型报价
          </Button>
        </View>

        <View className='detail-card'>
          <Text className='section-title'>附近地点</Text>
          {(detail?.nearby_points || []).slice(0, 12).map((p, idx) => (
            <View key={`${p.name}-${idx}`} className='nearby-row'>
              <Text>{p.type === 'metro' ? '地铁/车站' : '景点/商圈'} · {p.name}</Text>
              <Text>{Number(p.distance_km || 0).toFixed(1)}km</Text>
            </View>
          ))}
          {loading && <Text className='detail-sub'>加载中...</Text>}
        </View>
      </ScrollView>

      {showCalendarSheet && (
        <View className='detail-mask' onClick={() => setShowCalendarSheet(false)}>
          <View className='detail-sheet' onClick={(e) => e.stopPropagation()}>
            <View className='sheet-top'>
              <Text className='sheet-close' onClick={() => setShowCalendarSheet(false)}>关闭</Text>
              <Text className='sheet-title'>选择日期</Text>
              <Text className='sheet-hint'>{roomsCount}间房</Text>
            </View>

            <View className='sheet-month-head'>
              <View className='sheet-arrow' onClick={() => setSheetMonth((m) => prevMonth(m))}>◀</View>
              <Text className='sheet-month-title'>{monthTitle(sheetMonth)}</Text>
              <View className='sheet-arrow' onClick={() => setSheetMonth((m) => nextMonthKey(m))}>▶</View>
            </View>

            <View className='week-row'>
              {weekdayLabels.map((w) => (
                <Text key={w} className='week-cell'>{w}</Text>
              ))}
            </View>

            <View className='sheet-grid'>
              {gridCells.map((dateStr, idx) => {
                if (!dateStr) return <View key={`blank-${idx}`} className='sheet-day blank' />
                const dayInfo = calendarPriceMap.get(dateStr)
                const isPast = dayjs(dateStr).isBefore(dayjs(todayDateKey), 'day')
                const isDisabledByRange = tempCheckIn && !tempCheckOut && dayjs(dateStr).isBefore(dayjs(tempCheckIn), 'day')
                const isSelected = dateStr === tempCheckIn || dateStr === tempCheckOut
                const isInRange =
                  tempCheckIn &&
                  tempCheckOut &&
                  dayjs(dateStr).isAfter(dayjs(tempCheckIn), 'day') &&
                  dayjs(dateStr).isBefore(dayjs(tempCheckOut), 'day')
                const dayPrice = dayInfo?.min_price != null ? Math.round((dayInfo.min_price * roomsCount) / 100) : null
                const unavailable = dayInfo && !dayInfo.is_available
                const isDisabled = isPast || isDisabledByRange || unavailable

                return (
                  <View
                    key={dateStr}
                    className={`sheet-day ${isSelected ? 'active' : ''} ${isInRange ? 'in-range' : ''} ${isDisabled ? 'disabled' : ''} ${isPast ? 'past' : ''} ${unavailable ? 'unavailable' : ''}`}
                    onClick={() => {
                      if (isDisabled) return
                      onPickDate(dateStr)
                    }}
                  >
                    <Text className='sheet-day-num'>{dayjs(dateStr).date()}</Text>
                    <Text className='sheet-day-price'>
                      {dayPrice == null ? '—' : `¥${dayPrice}`}
                    </Text>
                  </View>
                )
              })}
            </View>

            <View className='sheet-foot-note'>
              <Text>显示当前酒店在该日期的最低价，按 {roomsCount} 间房估算。</Text>
              {!!sheetCalendarLoading && <Text> 日历加载中...</Text>}
            </View>

            <View className='sheet-range-bar'>
              <View>
                <Text className='range-label'>入住</Text>
                <Text className='range-value'>{tempCheckIn ? dayjs(tempCheckIn).format('MM月DD日') : '请选择'}</Text>
              </View>
              <View>
                <Text className='range-label'>离店</Text>
                <Text className='range-value'>{tempCheckOut ? dayjs(tempCheckOut).format('MM月DD日') : '请选择'}</Text>
              </View>
            </View>

            <Button className='primary-btn sheet-confirm' onClick={confirmCalendar}>确认日期</Button>
          </View>
        </View>
      )}
    </View>
  )
}
