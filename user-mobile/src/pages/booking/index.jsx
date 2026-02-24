import { useEffect, useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Button, ScrollView } from '@tarojs/components'
import dayjs from 'dayjs'
import { api, bookingStore, getStoredUser } from '../../utils/api'
import './index.css'

const cleanText = (v, max = 30) => String(v ?? '').replace(/[\r\n\t]/g, ' ').trim().slice(0, max)
const cleanPhone = (v) => String(v ?? '').replace(/[^\d+]/g, '').slice(0, 20)
const decodeParam = (v) => {
  if (!v) return ''
  try {
    return decodeURIComponent(String(v))
  } catch {
    return String(v)
  }
}
const normalizeDateParam = (v, fallback) => {
  const raw = decodeParam(v)
  const d = dayjs(raw)
  return d.isValid() ? d.startOf('day').toISOString() : fallback
}

const ensureFutureStay = (checkInIso, checkOutIso) => {
  const today = dayjs().startOf('day')
  let inDay = dayjs(checkInIso)
  let outDay = dayjs(checkOutIso)
  if (!inDay.isValid() || inDay.isBefore(today, 'day')) inDay = today
  if (!outDay.isValid() || !outDay.isAfter(inDay, 'day')) outDay = inDay.add(1, 'day')
  return { checkIn: inDay.toISOString(), checkOut: outDay.toISOString() }
}

export default function BookingPage() {
  const router = Taro.getCurrentInstance().router
  const params = router?.params || {}
  const hotelId = params.hotelId || ''
  const roomId = params.roomId || ''
  const fallbackCheckIn = dayjs().startOf('day').toISOString()
  const normalizedStay = ensureFutureStay(
    normalizeDateParam(params.check_in, fallbackCheckIn),
    normalizeDateParam(params.check_out, dayjs(fallbackCheckIn).add(1, 'day').toISOString()),
  )
  const checkIn = normalizedStay.checkIn
  const checkOut = normalizedStay.checkOut
  const roomsCount = Math.max(1, Number(params.rooms_count || 1))
  const totalPrice = Math.max(0, Number(params.total_price || 0))
  const initialGuestCount = Math.max(1, Number(params.guest_count || roomsCount))

  const storedUser = getStoredUser()
  const [hotelName, setHotelName] = useState('酒店')
  const [roomName, setRoomName] = useState('房型')
  const [contactName, setContactName] = useState(cleanText(storedUser?.email?.split('@')?.[0] || ''))
  const [phone, setPhone] = useState('')
  const [guestCount, setGuestCount] = useState(initialGuestCount)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!hotelId) return
    api.getHotelDetail(hotelId, { check_in: checkIn, check_out: checkOut, rooms_count: roomsCount })
      .then((d) => {
        setHotelName(d?.name_cn || '酒店')
        const matched = (d?.room_price_list || []).find((x) => x.room_id === roomId)
        if (matched?.room_name) setRoomName(matched.room_name)
        if (!guestCount && matched?.max_occupancy) setGuestCount(Math.min(matched.max_occupancy, roomsCount))
      })
      .catch(() => {})
  }, [hotelId, roomId, checkIn, checkOut, roomsCount])

  const nights = useMemo(() => Math.max(dayjs(checkOut).diff(dayjs(checkIn), 'day'), 1), [checkIn, checkOut])

  const onSubmit = async () => {
    if (!contactName || contactName.length < 2) {
      Taro.showToast({ title: '请填写联系人姓名', icon: 'none' })
      return
    }
    if (!phone || phone.length < 6) {
      Taro.showToast({ title: '请填写有效手机号', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      const result = await api.createBooking({
        hotel_id: hotelId,
        room_id: roomId,
        check_in: checkIn,
        check_out: checkOut,
        rooms_count: roomsCount,
        guest_count: guestCount,
        contact_name: contactName,
        contact_phone: phone,
        user_id: storedUser?.id,
      })

      bookingStore.add({
        id: result.id,
        status: result.status,
        hotel_id: hotelId,
        hotel_name: hotelName,
        room_id: roomId,
        room_name: roomName,
        check_in: checkIn,
        check_out: checkOut,
        rooms_count: roomsCount,
        guest_count: guestCount,
        total_amount: result.total_amount,
        created_at: result.created_at,
      })

      Taro.showModal({
        title: '预订成功',
        content: `订单号：${result.id}`,
        showCancel: false,
        success: () => Taro.redirectTo({ url: '/pages/profile/index' }),
      })
    } catch (err) {
      Taro.showToast({ title: err.message || '预订失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className='booking-page'>
      <View className='booking-top'>
        <Text onClick={() => Taro.navigateBack()}>←</Text>
        <Text className='booking-top-title'>确认预订</Text>
        <Text onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })}>我</Text>
      </View>

      <ScrollView scrollY className='booking-scroll'>
        <View className='card'>
          <Text className='card-title'>{hotelName}</Text>
          <Text className='card-sub'>{roomName}</Text>
          <View className='row'>
            <Text>{dayjs(checkIn).format('MM/DD')} - {dayjs(checkOut).format('MM/DD')}</Text>
            <Text>{nights}晚 · {roomsCount}间</Text>
          </View>
        </View>

        <View className='card'>
          <Text className='card-title'>联系人信息</Text>
          <Input
            className='inp'
            value={contactName}
            placeholder='联系人姓名'
            maxlength={30}
            onInput={(e) => setContactName(cleanText(e.detail.value, 30))}
          />
          <Input
            className='inp'
            value={phone}
            type='number'
            placeholder='手机号'
            maxlength={20}
            onInput={(e) => setPhone(cleanPhone(e.detail.value))}
          />
          <View className='guest-row'>
            <Text>入住人数</Text>
            <View className='counter-actions'>
              <View className='counter-btn' onClick={() => setGuestCount((v) => Math.max(1, v - 1))}>-</View>
              <Text>{guestCount}</Text>
              <View className='counter-btn' onClick={() => setGuestCount((v) => Math.min(8, v + 1))}>+</View>
            </View>
          </View>
        </View>

        <View className='card'>
          <Text className='card-title'>温馨提示</Text>
          <Text className='card-sub'>请确认入住日期、房型与人数。订单创建后可在个人页查看并尝试取消。</Text>
          {!storedUser?.id && (
            <Text className='warn-text'>当前未登录个人账号，订单将作为游客订单创建。</Text>
          )}
        </View>
      </ScrollView>

      <View className='fixed-bar'>
        <View>
          <Text className='card-sub'>总价</Text>
          <Text className='price'>¥{Math.round(totalPrice / 100)}</Text>
        </View>
        <Button className='submit-btn' loading={submitting} onClick={onSubmit}>提交预订</Button>
      </View>
    </View>
  )
}
