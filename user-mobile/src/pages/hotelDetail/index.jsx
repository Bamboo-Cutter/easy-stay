import { useEffect, useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Swiper, SwiperItem, Image, ScrollView, Button } from '@tarojs/components'
import dayjs from 'dayjs'
import { api } from '../../utils/api'
import './index.css'

// 给 check_out 默认值用：在 check_in 基础上 +1 天。
function nextDay(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// 路由参数兼容解码，防止编码异常导致页面白屏。
function decodeParam(v) {
  if (!v) return ''
  try {
    return decodeURIComponent(String(v))
  } catch {
    return String(v)
  }
}

// 将 URL 中的日期参数统一成 ISO（当天 00:00），无效时回退到 fallback。
function normalizeDateParam(v, fallback) {
  const raw = decodeParam(v)
  if (!raw) return fallback
  const d = dayjs(raw)
  if (!d.isValid()) return fallback
  return d.startOf('day').toISOString()
}

// 防止非法日期组合进入后续查询：
// - 入住不能是过去
// - 离店必须晚于入住
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

// 日历弹层相关的小工具函数（按月构造网格/标题/翻月）。
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

const clampInt = (v, min, max) => Math.max(min, Math.min(max, Number(v) || min))

export default function HotelDetailPage() {
  // 页面由酒店 ID + 查询条件驱动：日期、房间数、人数变化都会刷新“详情/报价/日历”。
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
  // detail/summary/calendar/offers 分别来自不同接口，便于接口失败时独立处理/替换。
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
  const [offers, setOffers] = useState(null)
  const [activeOffer, setActiveOffer] = useState(null)
  const [adultCount, setAdultCount] = useState(initialAdults)
  // baseData = 酒店基础详情（包含所有房型基础信息），用于“所有房型”区块展示。
  const [baseData, setBaseData] = useState(null)

  // 主数据加载 effect：
  // 同时拉酒店详情、评分摘要、月历、推荐报价、基础房型列表，避免页面分段闪烁。
  useEffect(() => {
    if (!hotelId) return
    setLoading(true)
    Promise.all([
      api.getHotelDetail(hotelId, { check_in: checkIn, check_out: checkOut, rooms_count: roomsCount }),
      api.getReviewSummary(hotelId),
      api.getHotelCalendar(hotelId, dayjs(checkIn).format('YYYY-MM')),
      api.getHotelOffers(hotelId, {
        check_in: checkIn,
        check_out: checkOut,
        rooms_count: roomsCount,
        adults: adultCount,
      }),
      api.getHotelRooms(hotelId) // 新加的接口
    ])
    
      .then(([d, s, c, offerData, baseInfo]) => {
        setDetail(d)
        setSummary(s)
        setCalendar(c)
        setOffers(offerData)
        // “所有房型”区块单独依赖基础详情接口，不与推荐报价混用。
        setBaseData(baseInfo)
      })
      .catch((err) => Taro.showToast({ title: err.message || '加载失败', icon: 'none' }))
      .finally(() => setLoading(false))
  }, [hotelId, checkIn, checkOut, roomsCount, adultCount])

  // 动态设置导航栏标题，用户在详情页停留时能看到当前酒店名。
  useEffect(() => {
    if (detail?.name_cn) {
      Taro.setNavigationBarTitle({ title: detail.name_cn })
    }
  }, [detail])

  // 只有打开日期弹层时才请求该月日历，避免平时重复拉无用数据。
  useEffect(() => {
    if (!showCalendarSheet || !hotelId || !sheetMonth) return
    setSheetCalendarLoading(true)
    api.getHotelCalendar(hotelId, sheetMonth)
      .then(setSheetCalendar)
      .catch((err) => Taro.showToast({ title: err.message || '日历加载失败', icon: 'none' }))
      .finally(() => setSheetCalendarLoading(false))
  }, [showCalendarSheet, hotelId, sheetMonth])

  // 酒店主图：优先后端 hotel_images，没有则用占位图兜底。
  const images = useMemo(
    () => (detail?.hotel_images?.length ? detail.hotel_images : [{ url: 'https://picsum.photos/seed/hotel-detail-fallback/1200/800' }]),
    [detail],
  )

  // 页面展示所需的派生状态（评分、晚数、日历映射等）统一集中在这里。
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

  // 打开日历弹层时，把“当前已选日期”复制到临时状态，用户取消时不污染主状态。
  const openCalendarSheet = () => {
    setTempCheckIn(dayjs(checkIn).format('YYYY-MM-DD'))
    setTempCheckOut(dayjs(checkOut).format('YYYY-MM-DD'))
    setSheetMonth(toMonthKey(checkIn))
    setShowCalendarSheet(true)
  }

  const onPickDate = (dateStr) => {
    if (!dateStr) return
    // 第一次点：选入住；第二次点：若在入住之后则选离店，否则重置入住。
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
  // 下面是“推荐房型”区块的派生列表（与 roomOffers 页保持同一套分组逻辑）。
  const guestCount = adultCount
  const items = offers?.items || []
  const bookableItems = useMemo(() => items.filter((x) => x.is_bookable), [items])
  const soldOutItems = useMemo(
    () => items.filter((x) => !x.is_bookable && x.capacity_fit && x.availability_status === 'SOLD_OUT'),
    [items],
  )
  const capacityMismatchItems = useMemo(
    () => items.filter((x) => !x.capacity_fit || x.availability_status === 'CAPACITY_MISMATCH'),
    [items],
  )
  const noBookable = !loading && bookableItems.length === 0
  const noRoomsAtAll = !loading && items.length === 0

  // 推荐房型卡片渲染（与 roomOffers 页相似，但在详情页里作为嵌入区块出现）。
  const renderOfferCard = (item, muted = false) => {
    const reasonText = item.availability_status === 'PAST_DATE'
      ? '入住日期已过，请重新选择日期'
      : !item.capacity_fit
      ? `人数不符合（最多 ${item.max_occupancy} 人）`
      : !item.is_available
        ? '该日期已满房'
        : ''
    return (
      <View key={item.room_id} className={`offer-card ${muted ? 'offer-card-muted' : ''}`}>
        <Image className='offer-cover' src={`https://picsum.photos/seed/${item.room_id}/480/320`} mode='aspectFill' />
        <View className='offer-body'>
          <Text className='offer-name'>{item.room_name}</Text>
          <Text className='offer-meta'>
            最多{item.max_occupancy}人 · {item.breakfast ? '含早餐' : '不含早餐'} · {item.refundable ? '可退款' : '不可退款'}
          </Text>
          <Text className='offer-meta'>剩余 {item.available_rooms} 间</Text>
          {!!reasonText && <Text className='offer-reason'>{reasonText}</Text>}
          <View className='offer-actions'>
            <Text className='link-text' onClick={() => setActiveOffer(item)}>价格详情</Text>
            <View className='offer-right'>
              <Text className='offer-price'>¥{Math.round((item.total_price || 0) / 100)}</Text>
              <Button
                className='book-btn' 
                // disabled={!item.is_bookable}
                // 进入预订页时，把当前详情页的筛选条件完整带过去。
                onClick={() =>
                  Taro.navigateTo({
                    url: `/pages/booking/index?hotelId=${hotelId}&roomId=${item.room_id}&check_in=${encodeURIComponent(checkIn)}&check_out=${encodeURIComponent(checkOut)}&rooms_count=${roomsCount}&total_price=${item.total_price}&guest_count=${guestCount}`,
                  })
                }
              >预订
                {/* {item.is_bookable
                  ? '预订'
                  : item.availability_status === 'PAST_DATE'
                    ? '日期已过'
                    : (!item.capacity_fit ? '人数不符' : '已满房')} */}
              </Button>
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='detail-page'>
      <View className='detail-hero'>
        <View className='detail-nav'>
          <View className='circle-btn' onClick={() => Taro.navigateBack()}>＜</View>
          <View className='circle-btn' onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}>我</View>
        </View>
      </View>

      <ScrollView scrollY className='detail-scroll'>
        <View className='banner'>
        <Swiper indicatorDots autoplay circular className='detail-swiper'>
          {images.map((img, idx) => (
            <SwiperItem key={idx}>
              <Image className='detail-hero-img' src={img.url} mode='aspectFill' />
            </SwiperItem>
          ))}
        </Swiper>
        </View>


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
          <Text className='section-title'>入住信息-推荐房型</Text>
          {/* 点击条打开日历弹层：修改日期后会触发整个详情页重新拉推荐报价。 */}
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
                // 这里只展示未来可订且有最低价的数据点，作为“快捷选日入口”。
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



          <View className='offers-controls'>
            <View className='ctl-item'>
              <Text className='ctl-label'>房间</Text>
              <View className='ctl-actions'>
                <View className='ctl-btn' onClick={() => setRoomsCount((v) => Math.max(1, v - 1))}>-</View>
                <Text className='ctl-value'>{roomsCount}</Text>
                <View className='ctl-btn' onClick={() => setRoomsCount((v) => Math.min(6, v + 1))}>+</View>
              </View>
            </View>
            <View className='ctl-item'>
              <Text className='ctl-label'>成人</Text>
              <View className='ctl-actions'>
                <View className='ctl-btn' onClick={() => setAdultCount((v) => Math.max(1, v - 1))}>-</View>
                <Text className='ctl-value'>{adultCount}</Text>
                <View className='ctl-btn' onClick={() => setAdultCount((v) => Math.min(12, v + 1))}>+</View>
              </View>
            </View>
          </View>

          <ScrollView scrollY className='offers-list'>
            {!!loading && <View className='empty-box'><Text className='empty-title'>报价加载中...</Text></View>}
            {!loading && noRoomsAtAll && (
              <View className='empty-box'>
                <Text className='empty-title'>当前酒店暂无推荐房型</Text>
              </View>
            )}
            {!loading && noBookable && items.length > 0 && (
              <View className='empty-box'>
                <Text className='empty-title'>当前条件下暂无推荐房型</Text>
                <Text className='empty-sub'>请尝试减少人数、增加房间数，或更换日期。下面保留了其他房型以供参考。</Text>
              </View>
            )}

            {!!bookableItems.length && (
              <View className='group-wrap'>
                <Text className='group-title'>推荐房型</Text>
                {bookableItems.map((item) => renderOfferCard(item, false))}
              </View>
            )}

            {!!soldOutItems.length && (
              <View className='group-wrap'>
                <Text className='group-title muted'>其他房型（已满房）</Text>
                {soldOutItems.map((item) => renderOfferCard(item, true))}
              </View>
            )}

            {!!capacityMismatchItems.length && (
              <View className='group-wrap'>
                <Text className='group-title muted'>其他房型（人数不符合）</Text>
                {capacityMismatchItems.map((item) => renderOfferCard(item, true))}
              </View>
            )}
          </ScrollView>

          {!!activeOffer && <View className='mask' onClick={() => setActiveOffer(null)} />}
          {!!activeOffer && (
            <View className='sheet'>
              <View className='sheet-head'>
                <Text>{activeOffer.room_name}</Text>
                <Text onClick={() => setActiveOffer(null)}>关闭</Text>
              </View>
              <View className='sheet-body'>
                <View className='sheet-row'>
                  <Text>均价（每晚）</Text>
                  <Text>¥{Math.round((activeOffer.nightly_price || 0) / 100)}</Text>
                </View>
                <View className='sheet-row'>
                  <Text>入住晚数</Text>
                  <Text>{activeOffer.nights}晚</Text>
                </View>
                <View className='sheet-row'>
                  <Text>房间数量</Text>
                  <Text>{roomsCount}间</Text>
                </View>
                <View className='sheet-row'>
                  <Text>入住人数</Text>
                  <Text>{adultCount}位住客</Text>
                </View>
                <View className='sheet-row'>
                  <Text>当前状态</Text>
                  <Text>
                    {activeOffer.is_bookable
                      ? '可预订'
                      : activeOffer.availability_status === 'PAST_DATE'
                        ? '日期已过'
                      : (!activeOffer.capacity_fit ? '人数不符合' : '该日期满房')}
                  </Text>
                </View>
                <View className='sheet-row total'>
                  <Text>总价</Text>
                  <Text>¥{Math.round((activeOffer.total_price || 0) / 100)}</Text>
                </View>
              </View>
            </View>
          )}
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
          {/* 阻止点击弹层内容时冒泡关闭；只允许点击遮罩关闭。 */}
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
                // 禁用规则统一收敛在这里，渲染层只关心最终 className。
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
