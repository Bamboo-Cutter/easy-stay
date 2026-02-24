import { useEffect, useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Button, ScrollView } from '@tarojs/components'
import { api, bookingStore, clearStoredUser, clearToken, getStoredUser, setStoredUser, setToken } from '../../utils/api'
import './index.css'

const PASSWORD_HINT = '8-64位，包含大小写字母、数字和特殊字符'
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])\S{8,64}$/

const normEmail = (v) => String(v ?? '').trim().toLowerCase().slice(0, 100)
const normText = (v, n = 64) => String(v ?? '').replace(/[\r\n\t]/g, ' ').trim().slice(0, n)

export default function ProfilePage() {
  const [user, setUser] = useState(getStoredUser())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState([])
  const [refreshingOrderId, setRefreshingOrderId] = useState('')

  const loggedIn = !!user?.id

  const orderCount = useMemo(() => orders.length, [orders])

  const refreshOrders = async () => {
    const localOrders = bookingStore.list()
    setOrders(localOrders)
  }

  const refreshMe = async () => {
    try {
      const me = await api.me()
      setStoredUser(me)
      setUser(me)
    } catch {
      clearToken()
      clearStoredUser()
      setUser(null)
    }
  }

  useEffect(() => {
    refreshOrders()
    if (loggedIn) {
      refreshMe()
    }
  }, [])

  const submitAuth = async () => {
    const nextEmail = normEmail(email)
    const nextPassword = String(password || '').slice(0, 64)

    if (!nextEmail) {
      Taro.showToast({ title: '请输入邮箱', icon: 'none' })
      return
    }
    if (!PASSWORD_REGEX.test(nextPassword)) {
      Taro.showToast({ title: '密码格式不符合要求', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      if (authMode === 'register') {
        await api.register({ email: nextEmail, password: nextPassword, role: 'USER' })
        Taro.showToast({ title: '注册成功，请登录', icon: 'none' })
        setAuthMode('login')
      } else {
        const res = await api.login({ email: nextEmail, password: nextPassword })
        setToken(res.access_token)
        setStoredUser(res.user)
        setUser(res.user)
        Taro.showToast({ title: '登录成功', icon: 'success' })
      }
    } catch (err) {
      Taro.showToast({ title: err.message || (authMode === 'login' ? '登录失败' : '注册失败'), icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch {}
    clearToken()
    clearStoredUser()
    setUser(null)
    Taro.showToast({ title: '已退出登录', icon: 'none' })
  }

  const refreshOrderDetail = async (id) => {
    setRefreshingOrderId(id)
    try {
      const detail = await api.getBooking(id)
      bookingStore.replace({
        id: detail.id,
        status: detail.status,
        hotel_name: detail.hotel?.name_cn,
        room_name: detail.room?.name,
        check_in: detail.check_in,
        check_out: detail.check_out,
        rooms_count: detail.rooms_count,
        guest_count: detail.guest_count,
        total_amount: detail.total_amount,
      })
      refreshOrders()
      await Taro.showModal({
        title: '订单详情',
        showCancel: false,
        content: [
          `订单号：${detail.id}`,
          `酒店：${detail.hotel?.name_cn || '-'}`,
          `房型：${detail.room?.name || '-'}`,
          `入住：${String(detail.check_in || '').slice(0, 10)}`,
          `离店：${String(detail.check_out || '').slice(0, 10)}`,
          `房间数：${detail.rooms_count || 1}间`,
          `入住人数：${detail.guest_count || '-'}`,
          `状态：${detail.status || '-'}`,
          `金额：¥${Math.round(Number(detail.total_amount || 0) / 100)}`,
          `联系人：${detail.contact_name || '-'}`,
          `手机号：${detail.contact_phone || '-'}`,
        ].join('\n'),
      })
    } catch (err) {
      Taro.showToast({ title: err.message || '查询订单失败', icon: 'none' })
    } finally {
      setRefreshingOrderId('')
    }
  }

  const cancelOrder = async (id) => {
    try {
      await api.cancelBooking(id)
      Taro.showToast({ title: '订单已取消', icon: 'none' })
      refreshOrderDetail(id)
    } catch (err) {
      Taro.showToast({ title: err.message || '取消失败', icon: 'none' })
    }
  }

  return (
    <View className='profile-page'>
      <View className='profile-top'>
        <Text onClick={() => Taro.navigateBack()}>←</Text>
        <Text className='profile-title'>个人中心</Text>
        <Text onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>首页</Text>
      </View>

      <ScrollView scrollY className='profile-scroll'>
        <View className='card'>
          <Text className='card-title'>个人账号</Text>
          {loggedIn ? (
            <View>
              <Text className='muted-line'>邮箱：{user.email}</Text>
              <Text className='muted-line'>角色：{user.role === 'USER' ? '普通用户' : user.role}</Text>
              <View className='btn-row'>
                <Button className='btn secondary' onClick={refreshMe}>刷新信息</Button>
                <Button className='btn danger' onClick={logout}>退出登录</Button>
              </View>
            </View>
          ) : (
            <View>
              <View className='mode-row'>
                <View className={`mode-pill ${authMode === 'login' ? 'active' : ''}`} onClick={() => setAuthMode('login')}>登录</View>
                <View className={`mode-pill ${authMode === 'register' ? 'active' : ''}`} onClick={() => setAuthMode('register')}>注册</View>
              </View>
              <Input className='inp' type='text' maxlength={100} placeholder='邮箱' value={email} onInput={(e) => setEmail(normEmail(e.detail.value))} />
              <Input className='inp' type='password' maxlength={64} placeholder='密码' value={password} onInput={(e) => setPassword(normText(e.detail.value, 64))} />
              <Text className='hint'>{PASSWORD_HINT}</Text>
              <Button className='btn primary' loading={loading} onClick={submitAuth}>
                {authMode === 'login' ? '登录账号' : '注册账号'}
              </Button>
            </View>
          )}
        </View>

        <View className='card'>
          <View className='title-line'>
            <Text className='card-title'>我的订单（本机记录）</Text>
            <Text className='small-link' onClick={refreshOrders}>刷新</Text>
          </View>
          <Text className='hint'>已保存 {orderCount} 条。下单成功后会自动记录，可在此查询详情与取消。</Text>
          {!orders.length && <Text className='muted-line'>暂无订单记录</Text>}
          {orders.map((order) => (
            <View key={order.id} className='order-card'>
              <Text className='order-title'>{order.hotel_name || '酒店订单'}</Text>
              <Text className='muted-line'>订单号：{order.id}</Text>
              <Text className='muted-line'>{order.room_name || ''}</Text>
              <Text className='muted-line'>
                {String(order.check_in || '').slice(0, 10)} - {String(order.check_out || '').slice(0, 10)} · {order.rooms_count || 1}间
              </Text>
              <Text className='muted-line'>状态：{order.status || 'UNKNOWN'} · 金额：¥{Math.round(Number(order.total_amount || 0) / 100)}</Text>
              <View className='btn-row'>
                <Button
                  className='btn secondary'
                  loading={refreshingOrderId === order.id}
                  onClick={() => refreshOrderDetail(order.id)}
                >
                  查询详情
                </Button>
                {order.status !== 'CANCELLED' && (
                  <Button className='btn danger' onClick={() => cancelOrder(order.id)}>取消订单</Button>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
