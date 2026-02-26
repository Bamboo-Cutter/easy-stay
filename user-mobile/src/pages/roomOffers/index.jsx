import { useEffect, useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView, Button, Image } from '@tarojs/components'
import dayjs from 'dayjs'
import { api } from '../../utils/api'
import './index.css'

// 统一解码路由参数，避免 decodeURIComponent 因非法字符串直接抛异常。
const decodeParam = (v) => {
  if (!v) return ''
  try {
    return decodeURIComponent(String(v))
  } catch {
    return String(v)
  }
}

// 将 URL 参数日期标准化为“当天 00:00 的 ISO 字符串”，失败则回退 fallback。
const normalizeDateParam = (v, fallback) => {
  const raw = decodeParam(v)
  const d = dayjs(raw)
  return d.isValid() ? d.startOf('day').toISOString() : fallback
}

// 防御性修正入住/离店日期：
// 1) 入住不能早于今天
// 2) 离店必须晚于入住至少 1 天
const ensureFutureStay = (checkInIso, checkOutIso) => {
  const today = dayjs().startOf('day')
  let inDay = dayjs(checkInIso)
  let outDay = dayjs(checkOutIso)
  if (!inDay.isValid() || inDay.isBefore(today, 'day')) inDay = today
  if (!outDay.isValid() || !outDay.isAfter(inDay, 'day')) outDay = inDay.add(1, 'day')
  return { checkIn: inDay.toISOString(), checkOut: outDay.toISOString() }
}

// 把路由参数中的数字限制在业务允许范围内，避免 NaN/越界污染状态。
const clampInt = (v, min, max) => Math.max(min, Math.min(max, Number(v) || min))

export default function RoomOffersPage() {
  // 页面核心输入都来自路由参数：酒店 ID、入住离店、房间数、人数等。
  const router = Taro.getCurrentInstance().router
  const params = router?.params || {}
  const hotelId = params.hotelId || ''
  const fallbackCheckIn = dayjs().startOf('day').toISOString()
  const normalizedStay = ensureFutureStay(
    normalizeDateParam(params.check_in, fallbackCheckIn),
    normalizeDateParam(params.check_out, dayjs(fallbackCheckIn).add(1, 'day').toISOString()),
  )
  const checkIn = normalizedStay.checkIn
  const checkOut = normalizedStay.checkOut
  const initialRoomsCount = clampInt(params.rooms_count || 1, 1, 6)
  const initialAdults = clampInt(params.adults || Math.min(2, initialRoomsCount), 1, 12)

  // 原始报价数据（后端返回结构），派生列表会基于它做分类展示。
  const [offers, setOffers] = useState(null)
  const [hotelName, setHotelName] = useState('酒店')
  // “价格详情”底部弹层当前查看的房型。
  const [activeOffer, setActiveOffer] = useState(null)
  const [loading, setLoading] = useState(false)
  // 房间数 / 成人数会触发重新拉报价。
  const [roomsCount, setRoomsCount] = useState(initialRoomsCount)
  const [adultCount, setAdultCount] = useState(initialAdults)
  // 当前页面先按“成人数 = 住客数”处理（后续如果支持儿童，可从这里拆开）。
  const guestCount = adultCount

  // 当酒店、日期、房间数、人数变化时，同时拉取“报价”和“酒店基础信息”。
  // 这样页面顶部标题和报价列表能保持同一组筛选条件下的数据一致。
  useEffect(() => {
    if (!hotelId) return
    setLoading(true)
    Promise.all([
      api.getHotelOffers(hotelId, {
        check_in: checkIn,
        check_out: checkOut,
        rooms_count: roomsCount,
        adults: adultCount,
      }),
      api.getHotelDetail(hotelId, { check_in: checkIn, check_out: checkOut, rooms_count: roomsCount }),
    ])
      .then(([offerData, detail]) => {
        setOffers(offerData)
        setHotelName(detail?.name_cn || '酒店')
        setActiveOffer(null)
      })
      .catch((err) => Taro.showToast({ title: err.message || '加载房型失败', icon: 'none' }))
      .finally(() => setLoading(false))
  }, [hotelId, checkIn, checkOut, roomsCount, adultCount])

  // nights 主要用于价格说明弹层展示，不直接参与请求。
  const nights = Math.max(dayjs(checkOut).diff(dayjs(checkIn), 'day'), 1)
  const items = offers?.items || []
  // 将后端返回房型按业务状态分组，便于 UI 分区渲染。
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

  // 单个房型卡片渲染器：
  // muted=true 用于“不可用分组”，视觉上做弱化但保留价格和说明供参考。
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
        {/* 目前房型图使用 Picsum 占位图（seed = room_id），不是后端真实房型图片。 */}
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
                disabled={!item.is_bookable}
                // 将当前筛选条件透传到下单页，避免用户进入下单后还要重复选择日期/房间数。
                onClick={() =>
                  Taro.navigateTo({
                    url: `/pages/booking/index?hotelId=${hotelId}&roomId=${item.room_id}&check_in=${encodeURIComponent(checkIn)}&check_out=${encodeURIComponent(checkOut)}&rooms_count=${roomsCount}&total_price=${item.total_price}&guest_count=${guestCount}`,
                  })
                }
              >
                {item.is_bookable
                  ? '预订'
                  : item.availability_status === 'PAST_DATE'
                    ? '日期已过'
                    : (!item.capacity_fit ? '人数不符' : '已满房')}
              </Button>
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='offers-page'>
      {/* 顶部摘要块目前先注释保留，后续可恢复作为“固定头部概览”。 */}
      {/* <View className='offers-top'>
        <Text onClick={() => Taro.navigateBack()}> ＜ </Text>
        <Text className='offers-title'>{hotelName}</Text>
        <Text onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}>我</Text>
      </View>

      <View className='offers-summary'>
        <Text>{dayjs(checkIn).format('MM/DD')} - {dayjs(checkOut).format('MM/DD')} · {nights}晚</Text>
        <Text>{roomsCount}间房 · {adultCount}位住客</Text>
      </View> */}

      <View className='offers-controls'>
        {/* 房间数/成人数都会触发报价重新计算；这里不做 debounce，优先保证交互简单直接。 */}
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
        <Text className='ctl-hint'>
          当前共 {guestCount} 位住客。修改后将自动刷新房型；人数过多时部分房型会变为不可用。
        </Text>
      </View>

      <ScrollView scrollY className='offers-list'>
        {/* 下面几个空态是互斥的：加载中 / 完全无房型 / 有房型但当前条件不可订。 */}
        {!!loading && <View className='empty-box'><Text className='empty-title'>报价加载中...</Text></View>}
        {!loading && noRoomsAtAll && (
          <View className='empty-box'>
            <Text className='empty-title'>当前酒店暂无房型数据</Text>
            <Text className='empty-sub'>可尝试切换酒店或稍后重试。</Text>
          </View>
        )}
        {!loading && noBookable && items.length > 0 && (
          <View className='empty-box'>
            <Text className='empty-title'>当前条件下暂无可订房型</Text>
            <Text className='empty-sub'>你可以减少人数、增加房间数，或更换日期。下面保留了不可用房型供你参考。</Text>
          </View>
        )}

        {!!bookableItems.length && (
          <View className='group-wrap'>
            <Text className='group-title'>可订房型</Text>
            {bookableItems.map((item) => renderOfferCard(item, false))}
          </View>
        )}

        {!!soldOutItems.length && (
          <View className='group-wrap'>
            <Text className='group-title muted'>不可用房型（已满房）</Text>
            {soldOutItems.map((item) => renderOfferCard(item, true))}
          </View>
        )}

        {!!capacityMismatchItems.length && (
          <View className='group-wrap'>
            <Text className='group-title muted'>不可用房型（人数不符合）</Text>
            {capacityMismatchItems.map((item) => renderOfferCard(item, true))}
          </View>
        )}
      </ScrollView>

      {!!activeOffer && <View className='mask' onClick={() => setActiveOffer(null)} />}
      {!!activeOffer && (
        // 价格详情用底部弹层而不是跳新页，减少用户在房型列表中的来回跳转。
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
              <Text>{activeOffer.nights ?? nights}晚</Text>
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
  )
}
